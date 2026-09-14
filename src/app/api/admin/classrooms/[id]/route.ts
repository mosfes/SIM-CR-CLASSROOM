import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import {
  formatGroupNameForDisplay,
  getSimulationGroups,
  MAX_CLASSROOM_GROUP_COUNT,
  parseClassroomGroupCount,
} from "@/lib/simulation-groups";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;
    const classroom = await prisma.classroom.findUnique({
      where: { id },
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
        _count: {
          select: { groups: true },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...classroom,
        groups: classroom.groups.map((group) => ({
          ...group,
          name: formatGroupNameForDisplay(group.name),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching classroom:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลห้องเรียน" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องเรียนที่ต้องการแก้ไข" },
        { status: 400 }
      );
    }

    const existingClassroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        groups: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!existingClassroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive, groupCount: rawGroupCount } = body;

    const groupCount =
      rawGroupCount === undefined ? null : parseClassroomGroupCount(rawGroupCount);
    if (rawGroupCount !== undefined && groupCount === null) {
      return NextResponse.json(
        {
          success: false,
          error: `จำนวนห้องตรวจต้องเป็นจำนวนเต็มระหว่าง 1 ถึง ${MAX_CLASSROOM_GROUP_COUNT} ห้องตรวจ`,
        },
        { status: 400 }
      );
    }

    const dataToUpdate: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof isActive === "boolean") {
      dataToUpdate.isActive = isActive;
    }

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกชื่อห้องเรียน" },
          { status: 400 }
        );
      }
      if (cleanName !== existingClassroom.name) {
        const duplicate = await prisma.classroom.findFirst({
          where: { name: cleanName },
        });
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { success: false, error: `มีห้องเรียนชื่อ "${cleanName}" อยู่ในระบบแล้ว` },
            { status: 409 }
          );
        }
      }
      dataToUpdate.name = cleanName;
    }

    if (description !== undefined) {
      dataToUpdate.description = description && typeof description === "string" ? description.trim() : null;
    }

    const activeGroups = existingClassroom.groups.filter((group) => group.isActive);
    if (groupCount !== null && groupCount !== activeGroups.length) {
      const activeSession = await prisma.simulationSession.findFirst({
        where: { classroomId: id, status: { in: ["LOBBY", "RUNNING"] } },
        select: { roomCode: true },
      });

      if (activeSession) {
        return NextResponse.json(
          {
            success: false,
            error: `ไม่สามารถเปลี่ยนจำนวนห้องตรวจขณะมีรอบจำลอง ${activeSession.roomCode} กำลังใช้งาน`,
          },
          { status: 409 }
        );
      }
    }

    const updatedClassroom = await prisma.$transaction(async (tx) => {
      if (groupCount !== null) {
        const inactiveGroups = existingClassroom.groups.filter((group) => !group.isActive);
        const targetNames = getSimulationGroups(groupCount);

        if (groupCount < activeGroups.length) {
          const groupsToDeactivate = activeGroups.slice(groupCount);
          await tx.classroomGroup.updateMany({
            where: { id: { in: groupsToDeactivate.map((group) => group.id) } },
            data: { isActive: false },
          });
        } else if (groupCount > activeGroups.length) {
          const groupsToReactivate = inactiveGroups.slice(0, groupCount - activeGroups.length);
          if (groupsToReactivate.length > 0) {
            await Promise.all(
              groupsToReactivate.map((group, index) =>
                tx.classroomGroup.update({
                  where: { id: group.id },
                  data: {
                    name: targetNames[activeGroups.length + index].name,
                    isActive: true,
                  },
                })
              )
            );
          }

          const groupsToCreate = groupCount - activeGroups.length - groupsToReactivate.length;
          if (groupsToCreate > 0) {
            await tx.classroomGroup.createMany({
              data: targetNames.slice(groupCount - groupsToCreate).map((group) => ({
                classroomId: id,
                name: group.name,
                isActive: true,
              })),
            });
          }
        }
      }

      return tx.classroom.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          groups: {
            where: { isActive: true },
            select: { id: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    const { groups, ...classroomData } = updatedClassroom;

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลห้องเรียนสำเร็จ",
      data: {
        ...classroomData,
        groupCount: groups.length,
      },
    });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกการแก้ไขข้อมูลห้องเรียน" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องเรียนที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const existingClassroom = await prisma.classroom.findUnique({
      where: { id },
    });

    if (!existingClassroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    await prisma.classroom.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "ลบข้อมูลห้องเรียนเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูลห้องเรียน" },
      { status: 500 }
    );
  }
}
