import { NextRequest, NextResponse } from "next/server";
import {
  getSimulationSnapshotByRoomCode,
  normalizeRoomCode,
} from "@/lib/server/simulation-data";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode: rawRoomCode } = await context.params;
    const roomCode = normalizeRoomCode(rawRoomCode);
    if (!roomCode) {
      return NextResponse.json(
        { success: false, error: "รูปแบบเลขห้องไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const snapshot = await getSimulationSnapshotByRoomCode(roomCode);
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "ไม่พบห้องจำลองนี้" },
        { status: 404 }
      );
    }

    const toProjectorParticipant = (participant: (typeof snapshot.participants)[number]) => ({
      id: participant.id,
      role: participant.role,
      groupId: participant.groupId,
      student: { name: participant.student.name },
    });

    const projectorSnapshot = {
      ...snapshot,
      participants: snapshot.participants.map(toProjectorParticipant),
      groups: snapshot.groups.map((group) => ({
        ...group,
        participants: group.participants.map(toProjectorParticipant),
      })),
    };
    return NextResponse.json(
      { success: true, data: projectorSnapshot },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching projector simulation session:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถแสดงข้อมูลห้องจำลองได้" },
      { status: 500 }
    );
  }
}
