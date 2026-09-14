import { NextRequest, NextResponse } from "next/server";
import { getSimulationSessionForEntry, normalizeRoomCode } from "@/lib/server/simulation-data";

export async function GET(request: NextRequest) {
  try {
    const roomCode = normalizeRoomCode(request.nextUrl.searchParams.get("roomCode"));
    if (!roomCode) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกเลขห้อง 6 หลัก" },
        { status: 400 }
      );
    }

    const session = await getSimulationSessionForEntry(roomCode);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "ไม่พบห้องจำลองนี้ กรุณาตรวจสอบเลขห้องอีกครั้ง" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: session },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error looking up simulation session:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถตรวจสอบเลขห้องได้" },
      { status: 500 }
    );
  }
}
