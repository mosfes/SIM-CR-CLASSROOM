import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { getNurseChoiceDecoys } from "@/lib/server/play-data";
import { normalizeNurseDecoyList } from "@/lib/nurse-choices";

/** ตัวลวงของสถานีพยาบาล: ตัวเลือกต่อมไร้ท่อ/ฮอร์โมนที่ไม่ใช่คำตอบของโรคใดเลย */
export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const decoys = await getNurseChoiceDecoys();
    return NextResponse.json(
      { success: true, data: decoys },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching nurse decoys:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงตัวลวงของสถานีพยาบาล" },
      { status: 500 }
    );
  }
}

/** แทนที่รายการตัวลวงทั้งหมด (ส่งรายการเต็มของทั้งต่อมไร้ท่อและฮอร์โมน) */
export async function PUT(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    let glands: string[];
    let hormones: string[];
    try {
      glands = normalizeNurseDecoyList(body.glands, "ตัวลวงต่อมไร้ท่อ");
      hormones = normalizeNurseDecoyList(body.hormones, "ตัวลวงฮอร์โมน");
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "ข้อมูลตัวลวงไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.nurseChoiceDecoy.deleteMany({}),
      prisma.nurseChoiceDecoy.createMany({
        data: [
          ...glands.map((label) => ({ kind: "GLAND" as const, label })),
          ...hormones.map((label) => ({ kind: "HORMONE" as const, label })),
        ],
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกตัวลวงของสถานีพยาบาลเรียบร้อยแล้ว",
        data: { glands, hormones },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    console.error("Error saving nurse decoys:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกตัวลวงของสถานีพยาบาล" },
      { status: 500 }
    );
  }
}
