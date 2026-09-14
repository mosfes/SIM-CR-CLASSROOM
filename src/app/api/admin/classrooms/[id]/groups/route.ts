import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { formatGroupNameForDisplay } from "@/lib/simulation-groups";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id: classroomId } = await context.params;

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องเรียน" },
        { status: 400 }
      );
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกชื่อห้องตรวจ" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanDescription = description && typeof description === "string" ? description.trim() : null;

    // Check duplicate group name within the same classroom
    const existingGroup = await prisma.classroomGroup.findFirst({
      where: {
        classroomId,
        name: cleanName,
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        { success: false, error: `มีห้องตรวจชื่อ "${cleanName}" อยู่ในห้องเรียนนี้แล้ว` },
        { status: 409 }
      );
    }

    const group = await prisma.classroomGroup.create({
      data: {
        name: cleanName,
        description: cleanDescription,
        classroomId,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "เพิ่มห้องตรวจในห้องเรียนสำเร็จ",
        data: {
          ...group,
          name: formatGroupNameForDisplay(group.name),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสร้างห้องตรวจ" },
      { status: 500 }
    );
  }
}
