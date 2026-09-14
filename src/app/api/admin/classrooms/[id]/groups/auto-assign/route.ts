import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

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
      include: {
        groups: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { assignments } = body as {
      assignments: {
        name: string;
        studentIds: string[];
      }[];
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุข้อมูลการจัดห้องตรวจที่ถูกต้อง" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Existing groups
      const existingGroups = classroom.groups;
      const targetGroupIds: { id: string; name: string; studentIds: string[] }[] = [];

      for (let i = 0; i < assignments.length; i++) {
        const item = assignments[i];
      const groupName = item.name.trim() || `ห้องตรวจ ${i + 1}`;

        if (i < existingGroups.length) {
          // Reuse and update existing group
          const eg = existingGroups[i];
          const updated = await tx.classroomGroup.update({
            where: { id: eg.id },
            data: { name: groupName, isActive: true },
          });
          targetGroupIds.push({
            id: updated.id,
            name: updated.name,
            studentIds: item.studentIds,
          });
        } else {
          // Create new group
          const created = await tx.classroomGroup.create({
            data: {
              name: groupName,
              classroomId,
              isActive: true,
            },
          });
          targetGroupIds.push({
            id: created.id,
            name: created.name,
            studentIds: item.studentIds,
          });
        }
      }

      // If there are extra existing groups that were not used, delete them if they have no activity
      if (existingGroups.length > assignments.length) {
        for (let i = assignments.length; i < existingGroups.length; i++) {
          const extraGroup = existingGroups[i];
          try {
            await tx.classroomGroupMember.deleteMany({
              where: { groupId: extraGroup.id },
            });
            await tx.classroomGroup.delete({
              where: { id: extraGroup.id },
            });
          } catch {
            // If group has foreign key references (e.g. past game sessions), just set inactive
            await tx.classroomGroup.update({
              where: { id: extraGroup.id },
              data: { isActive: false },
            });
          }
        }
      }

      // Clear all existing memberships in this classroom
      await tx.classroomGroupMember.deleteMany({
        where: { classroomId },
      });

      // Insert new memberships
      const membersToCreate: { classroomId: string; groupId: string; studentId: string }[] = [];
      for (const target of targetGroupIds) {
        for (const sId of target.studentIds) {
          if (sId && sId.trim()) {
            membersToCreate.push({
              classroomId,
              groupId: target.id,
              studentId: sId.trim(),
            });
          }
        }
      }

      if (membersToCreate.length > 0) {
        await tx.classroomGroupMember.createMany({
          data: membersToCreate,
          skipDuplicates: true,
        });
      }

      return targetGroupIds;
    });

    // Return updated classroom
    const updatedClassroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        groups: {
          orderBy: { createdAt: "asc" },
          include: {
            members: {
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
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `สุ่มจัดห้องตรวจสำเร็จ (${result.length} ห้องตรวจ)`,
      data: updatedClassroom,
    });
  } catch (error) {
    console.error("Error auto-assigning groups:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสุ่มจัดห้องตรวจ" },
      { status: 500 }
    );
  }
}
