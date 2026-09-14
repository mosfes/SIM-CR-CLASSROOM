import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id: classroomId, groupId } = await context.params;

    if (!classroomId || !groupId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องเรียนหรือรหัสห้องตรวจ" },
        { status: 400 }
      );
    }

    const group = await prisma.classroomGroup.findFirst({
      where: { id: groupId, classroomId },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "ไม่พบห้องตรวจนี้ในห้องเรียน" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds)) {
      return NextResponse.json(
        { success: false, error: "รูปแบบข้อมูลนักเรียนไม่ถูกต้อง (ต้องเป็น Array)" },
        { status: 400 }
      );
    }

    const cleanStudentIds = Array.from(
      new Set(studentIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))
    );

    await prisma.$transaction(async (tx) => {
      // Remove any existing assignments for these selected students in this classroom
      // (This handles moving students from another group to this group)
      if (cleanStudentIds.length > 0) {
        await tx.classroomGroupMember.deleteMany({
          where: {
            classroomId,
            studentId: { in: cleanStudentIds },
          },
        });
      }

      // Remove any existing members in this group who are no longer selected
      await tx.classroomGroupMember.deleteMany({
        where: {
          groupId,
          studentId: { notIn: cleanStudentIds },
        },
      });

      // Add the selected students to this group
      if (cleanStudentIds.length > 0) {
        await tx.classroomGroupMember.createMany({
          data: cleanStudentIds.map((sId) => ({
            classroomId,
            groupId,
            studentId: sId,
          })),
          skipDuplicates: true,
        });
      }
    });

    // Fetch updated members
    const updatedMembers = await prisma.classroomGroupMember.findMany({
      where: { groupId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "อัปเดตรายชื่อสมาชิกห้องตรวจสำเร็จ",
      data: updatedMembers,
    });
  } catch (error) {
    console.error("Error updating group members:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสมาชิกห้องตรวจ" },
      { status: 500 }
    );
  }
}
