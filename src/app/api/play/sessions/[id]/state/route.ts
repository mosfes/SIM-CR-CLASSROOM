import { NextRequest, NextResponse } from "next/server";
import { getLobbyParticipantState } from "@/lib/server/simulation-data";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || "";
    if (!id || !studentId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้เล่นในห้องจำลอง" },
        { status: 400 }
      );
    }

    const participant = await getLobbyParticipantState({
      simulationId: id,
      studentId,
    });
    if (!participant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบการเข้าร่วมห้องจำลองนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: participant },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching participant simulation state:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถตรวจสอบสถานะเกมได้" },
      { status: 500 }
    );
  }
}
