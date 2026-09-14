import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlayRoleId } from "@/lib/server/simulation-data";

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const expectedOrigin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : request.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

async function parseParticipantInput(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("CONTENT_TYPE");
  }

  const body = (await request.json()) as {
    studentId?: unknown;
    groupId?: unknown;
    role?: unknown;
  };
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
  if (!studentId || !groupId || !isPlayRoleId(body.role)) {
    throw new Error("INVALID_INPUT");
  }
  return { studentId, groupId, role: body.role };
}

async function validateChoice({
  simulationId,
  studentId,
  groupId,
}: {
  simulationId: string;
  studentId: string;
  groupId: string;
}) {
  const [session, student] = await Promise.all([
    prisma.simulationSession.findUnique({
      where: { id: simulationId },
      select: {
        id: true,
        status: true,
        classroomId: true,
        classroom: {
          select: {
            groups: {
              where: { id: groupId, isActive: true },
              select: { id: true },
            },
          },
        },
      },
    }),
    prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT", isActive: true },
      select: { id: true },
    }),
  ]);

  if (!session || !student || session.classroom.groups.length === 0) return null;
  return session;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) return jsonError("คำขอไม่ผ่านการตรวจสอบความปลอดภัย", 403);

  try {
    const { id } = await context.params;
    const input = await parseParticipantInput(request);
    const session = await validateChoice({ simulationId: id, ...input });

    if (!session) {
      return jsonError("ไม่พบข้อมูลนักเรียน กลุ่ม หรือห้องจำลองที่เลือก", 400);
    }
    if (session.status !== "LOBBY") {
      return jsonError(
        session.status === "RUNNING"
          ? "เกมเริ่มไปแล้ว จึงไม่สามารถเข้าร่วมระหว่างทางได้"
          : "รอบจำลองนี้สิ้นสุดแล้ว",
        409
      );
    }

    const participant = await prisma.simulationParticipant.upsert({
      where: {
        simulationId_studentId: {
          simulationId: id,
          studentId: input.studentId,
        },
      },
      update: {
        groupId: input.groupId,
        role: input.role,
      },
      create: {
        simulationId: id,
        studentId: input.studentId,
        groupId: input.groupId,
        role: input.role,
      },
      select: {
        id: true,
        simulationId: true,
        studentId: true,
        groupId: true,
        role: true,
      },
    });
    return NextResponse.json(
      { success: true, data: participant },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Error && error.message === "CONTENT_TYPE") {
      return jsonError("รองรับเฉพาะข้อมูล JSON", 415);
    }
    if (error instanceof Error && error.message === "INVALID_INPUT") {
      return jsonError("กรุณาเลือกชื่อ กลุ่ม และบทบาทให้ครบ", 400);
    }
    console.error("Error joining simulation session:", error);
    return jsonError("ไม่สามารถเข้าร่วมห้องจำลองได้", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) return jsonError("คำขอไม่ผ่านการตรวจสอบความปลอดภัย", 403);

  try {
    const { id } = await context.params;
    const input = await parseParticipantInput(request);
    const session = await validateChoice({ simulationId: id, ...input });

    if (!session) {
      return jsonError("ไม่พบข้อมูลนักเรียน กลุ่ม หรือห้องจำลองที่เลือก", 400);
    }
    if (session.status !== "RUNNING") {
      return jsonError("สามารถสลับบทบาทได้เฉพาะระหว่างที่เกมกำลังดำเนินอยู่", 409);
    }

    const existing = await prisma.simulationParticipant.findUnique({
      where: {
        simulationId_studentId: {
          simulationId: id,
          studentId: input.studentId,
        },
      },
      select: { id: true },
    });
    if (!existing) return jsonError("ไม่พบการเข้าร่วมของนักเรียนในรอบนี้", 404);

    const participant = await prisma.simulationParticipant.update({
      where: { id: existing.id },
      data: { groupId: input.groupId, role: input.role },
      select: {
        id: true,
        simulationId: true,
        studentId: true,
        groupId: true,
        role: true,
      },
    });
    return NextResponse.json(
      { success: true, data: participant },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Error && error.message === "CONTENT_TYPE") {
      return jsonError("รองรับเฉพาะข้อมูล JSON", 415);
    }
    if (error instanceof Error && error.message === "INVALID_INPUT") {
      return jsonError("กรุณาเลือกนักเรียน กลุ่ม และบทบาทให้ครบ", 400);
    }
    console.error("Error switching simulation participant role:", error);
    return jsonError("ไม่สามารถเปลี่ยนบทบาทได้", 500);
  }
}
