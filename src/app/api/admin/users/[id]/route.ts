import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

const ADMIN_USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;

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
        { success: false, error: "ไม่พบรหัสผู้ใช้ที่ต้องการแก้ไข" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้นี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, username, password, name, studentId, isActive } = body;

    const dataToUpdate: {
      firstName?: string;
      lastName?: string;
      name?: string;
      username?: string;
      password?: string;
      studentId?: string;
      isActive?: boolean;
    } = {};

    if (typeof isActive === "boolean") {
      if (!isActive && id === authorization.admin.id) {
        return NextResponse.json(
          { success: false, error: "ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่ได้" },
          { status: 400 }
        );
      }
      dataToUpdate.isActive = isActive;
    }

    if (existingUser.role === "ADMIN") {
      // If updating profile fields
      if (firstName !== undefined || lastName !== undefined) {
        if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
          return NextResponse.json(
            { success: false, error: "กรุณากรอกชื่อและนามสกุลให้ครบถ้วน" },
            { status: 400 }
          );
        }
        const cleanFirstName = firstName.trim();
        const cleanLastName = lastName.trim();
        dataToUpdate.firstName = cleanFirstName;
        dataToUpdate.lastName = cleanLastName;
        dataToUpdate.name = `${cleanFirstName} ${cleanLastName}`;
      }

      if (username !== undefined) {
        if (!username || !username.trim()) {
          return NextResponse.json(
            { success: false, error: "กรุณากรอก Username" },
            { status: 400 }
          );
        }
        const cleanUsername = username.trim().toLowerCase();
        if (!ADMIN_USERNAME_PATTERN.test(cleanUsername)) {
          return NextResponse.json(
            { success: false, error: "Username ต้องมี 3-64 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง" },
            { status: 400 }
          );
        }
        if (cleanUsername !== existingUser.username?.toLowerCase()) {
          const duplicate = await prisma.user.findUnique({
            where: { username: cleanUsername },
          });
          if (duplicate && duplicate.id !== id) {
            return NextResponse.json(
              { success: false, error: `Username "${cleanUsername}" มีอยู่ในระบบแล้ว` },
              { status: 409 }
            );
          }
        }
        dataToUpdate.username = cleanUsername;
      }

      // Update password only if provided
      if (password && typeof password === "string" && password.trim().length > 0) {
        if (password.length < 8 || password.length > 256) {
          return NextResponse.json(
            { success: false, error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
            { status: 400 }
          );
        }
        dataToUpdate.password = await hashPassword(password);
      }
    } else if (existingUser.role === "STUDENT") {
      if (name !== undefined) {
        if (!name.trim()) {
          return NextResponse.json(
            { success: false, error: "กรุณากรอกชื่อ-นามสกุลนักเรียน" },
            { status: 400 }
          );
        }
        dataToUpdate.name = name.trim();
      }
      if (studentId !== undefined) {
        const cleanStudentId = studentId.trim();
        if (!cleanStudentId) {
          return NextResponse.json(
            { success: false, error: "กรุณากรอกรหัสนักเรียน" },
            { status: 400 }
          );
        }
        if (cleanStudentId !== existingUser.studentId) {
          const duplicate = await prisma.user.findUnique({
            where: { studentId: cleanStudentId },
          });
          if (duplicate && duplicate.id !== id) {
            return NextResponse.json(
              { success: false, error: `รหัสนักเรียน "${cleanStudentId}" มีอยู่ในระบบแล้ว` },
              { status: 409 }
            );
          }
        }
        dataToUpdate.studentId = cleanStudentId;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        role: true,
        username: true,
        firstName: true,
        lastName: true,
        studentId: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingUser.role === "ADMIN" && (dataToUpdate.password || dataToUpdate.isActive === false)) {
      await prisma.adminSession.deleteMany({ where: { userId: id } });
    }

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลสำเร็จ",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกการแก้ไข" },
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
        { success: false, error: "ไม่พบรหัสผู้ใช้ที่ต้องการลบ" },
        { status: 400 }
      );
    }

    if (id === authorization.admin.id) {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้นี้ในระบบ" },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `ลบข้อมูล ${user.name} เรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" },
      { status: 500 }
    );
  }
}
