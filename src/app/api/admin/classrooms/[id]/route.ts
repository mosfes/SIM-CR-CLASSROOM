import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

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
      data: classroom,
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
    });

    if (!existingClassroom) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลห้องเรียนนี้ในระบบ" },
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

    const updatedClassroom = await prisma.classroom.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลห้องเรียนสำเร็จ",
      data: updatedClassroom,
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
