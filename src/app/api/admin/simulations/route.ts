import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import {
  createSimulationSession,
  getSimulationSessionsForAdmin,
  getSimulationSnapshot,
} from "@/lib/server/simulation-data";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    return NextResponse.json(
      { success: true, data: await getSimulationSessionsForAdmin() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching simulation sessions:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลรอบจำลอง" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as { classroomId?: unknown };
    const classroomId = typeof body.classroomId === "string" ? body.classroomId.trim() : "";
    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกห้องเรียนสำหรับรอบจำลอง" },
        { status: 400 }
      );
    }

    const [classroom, activeSession] = await Promise.all([
      prisma.classroom.findFirst({
        where: { id: classroomId, isActive: true },
        select: { id: true },
      }),
      prisma.simulationSession.findFirst({
        where: { classroomId, status: { in: ["LOBBY", "RUNNING"] } },
        select: { id: true, roomCode: true, status: true },
      }),
    ]);

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบห้องเรียนที่เลือก หรือห้องเรียนถูกปิดใช้งาน" },
        { status: 404 }
      );
    }
    if (activeSession) {
      return NextResponse.json(
        {
          success: false,
          error:
            activeSession.status === "RUNNING"
              ? `ห้องเรียนนี้กำลังเล่นอยู่ในห้องจำลอง ${activeSession.roomCode}`
              : `ห้องเรียนนี้มีห้องจำลอง ${activeSession.roomCode} ที่กำลังรอผู้เข้าร่วม`,
        },
        { status: 409 }
      );
    }

    const session = await createSimulationSession({
      classroomId,
      createdById: authorization.admin.id,
    });
    const snapshot = await getSimulationSnapshot(session.id);

    return NextResponse.json(
      {
        success: true,
        message: "สร้างห้องจำลองและสุ่มเลขห้องเรียบร้อยแล้ว",
        data: snapshot,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error creating simulation session:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถสร้างรอบจำลองได้ กรุณาลองอีกครั้ง" },
      { status: 500 }
    );
  }
}
