import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/server/session";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      );
    }
    return NextResponse.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching current admin:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้" },
      { status: 500 }
    );
  }
}
