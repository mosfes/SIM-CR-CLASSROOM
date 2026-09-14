import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { getSimulationSnapshot } from "@/lib/server/simulation-data";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;
    const snapshot = await getSimulationSnapshot(id);
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรอบจำลองนี้" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, data: snapshot },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching simulation snapshot:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลรอบจำลอง" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    if (action !== "START" && action !== "END") {
      return NextResponse.json(
        { success: false, error: "คำสั่งควบคุมรอบจำลองไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const session = await prisma.simulationSession.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!session) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรอบจำลองนี้" },
        { status: 404 }
      );
    }

    if (action === "START" && session.status !== "LOBBY") {
      return NextResponse.json(
        { success: false, error: "รอบจำลองนี้ไม่อยู่ในสถานะรอเริ่ม" },
        { status: 409 }
      );
    }
    if (action === "END" && session.status === "ENDED") {
      return NextResponse.json(
        { success: false, error: "รอบจำลองนี้สิ้นสุดแล้ว" },
        { status: 409 }
      );
    }

    await prisma.simulationSession.update({
      where: { id },
      data:
        action === "START"
          ? { status: "RUNNING", startedAt: new Date() }
          : { status: "ENDED", endedAt: new Date() },
    });

    const snapshot = await getSimulationSnapshot(id);
    return NextResponse.json(
      {
        success: true,
        message: action === "START" ? "เริ่มเกมแล้ว นักเรียนที่รออยู่จะเข้าสถานีของตน" : "สิ้นสุดรอบจำลองแล้ว",
        data: snapshot,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error updating simulation session:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถอัปเดตสถานะรอบจำลองได้" },
      { status: 500 }
    );
  }
}
