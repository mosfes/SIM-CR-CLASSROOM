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

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องตรวจที่ต้องการแก้ไข" },
        { status: 400 }
      );
    }

    const existingGroup = await prisma.classroomGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup || existingGroup.classroomId !== classroomId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องตรวจนี้ในห้องเรียน" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

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
          { success: false, error: "กรุณากรอกชื่อห้องตรวจ" },
          { status: 400 }
        );
      }
      if (cleanName !== existingGroup.name) {
        const duplicate = await prisma.classroomGroup.findFirst({
          where: {
            classroomId,
            name: cleanName,
          },
        });
        if (duplicate && duplicate.id !== groupId) {
          return NextResponse.json(
            { success: false, error: `มีห้องตรวจชื่อ "${cleanName}" อยู่ในห้องเรียนนี้แล้ว` },
            { status: 409 }
          );
        }
      }
      dataToUpdate.name = cleanName;
    }

    if (description !== undefined) {
      dataToUpdate.description = description && typeof description === "string" ? description.trim() : null;
    }

    const updatedGroup = await prisma.classroomGroup.update({
      where: { id: groupId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลห้องตรวจสำเร็จ",
      data: updatedGroup,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลห้องตรวจ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const { id: classroomId, groupId } = await context.params;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสห้องตรวจที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const existingGroup = await prisma.classroomGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup || existingGroup.classroomId !== classroomId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องตรวจนี้ในห้องเรียน" },
        { status: 404 }
      );
    }

    await prisma.classroomGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({
      success: true,
      message: "ลบห้องตรวจเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการลบห้องตรวจ" },
      { status: 500 }
    );
  }
}
