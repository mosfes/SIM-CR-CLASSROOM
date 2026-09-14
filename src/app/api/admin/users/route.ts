import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

const ADMIN_USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const query = searchParams.get("q");

    const whereClause: {
      role?: "ADMIN" | "STUDENT";
      OR?: Array<{
        name?: { contains: string };
        studentId?: { contains: string };
        username?: { contains: string };
      }>;
    } = {};

    if (role === "ADMIN" || role === "STUDENT") {
      whereClause.role = role;
    }

    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { studentId: { contains: q } },
        { username: { contains: q } },
      ];
    }

    const shouldIncludeAllStats = !role && !query;

    const [users, roleCounts, diseaseCount, classroomCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          role: true,
          studentId: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      shouldIncludeAllStats ? prisma.disease.count() : Promise.resolve(0),
      shouldIncludeAllStats ? prisma.classroom.count() : Promise.resolve(0),
    ]);

    let studentCount = 0;
    let adminCount = 0;
    for (const item of roleCounts) {
      if (item.role === "STUDENT") studentCount = item._count._all;
      if (item.role === "ADMIN") adminCount = item._count._all;
    }
    const totalCount = studentCount + adminCount;

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount,
        students: studentCount,
        admins: adminCount,
        diseases: diseaseCount,
        classrooms: classroomCount,
      },
      data: users,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้จากฐานข้อมูล" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const { role } = body;

    if (!role || (role !== "ADMIN" && role !== "STUDENT")) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุประเภทผู้ใช้ให้ถูกต้อง (ADMIN หรือ STUDENT)" },
        { status: 400 }
      );
    }

    if (role === "STUDENT") {
      const { studentId, name } = body;

      if (!studentId || !studentId.trim()) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกรหัสนักเรียน" },
          { status: 400 }
        );
      }

      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกชื่อ-สกุลนักเรียน" },
          { status: 400 }
        );
      }

      const cleanStudentId = studentId.trim();
      const cleanName = name.trim();

      // Check duplicate studentId
      const existing = await prisma.user.findUnique({
        where: { studentId: cleanStudentId },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `รหัสนักเรียน "${cleanStudentId}" มีอยู่ในระบบแล้ว` },
          { status: 409 }
        );
      }

      const student = await prisma.user.create({
        data: {
          role: "STUDENT",
          studentId: cleanStudentId,
          name: cleanName,
        },
        select: {
          id: true,
          role: true,
          studentId: true,
          name: true,
          isActive: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        { success: true, message: "เพิ่มนักเรียนสำเร็จ", data: student },
        { status: 201 }
      );
    }

    if (role === "ADMIN") {
      const { firstName, lastName, username, password } = body;

      if (!firstName || !firstName.trim()) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกชื่อแอดมิน" },
          { status: 400 }
        );
      }

      if (!lastName || !lastName.trim()) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกนามสกุลแอดมิน" },
          { status: 400 }
        );
      }

      if (!username || !username.trim()) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกชื่อผู้ใช้ (Username)" },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string" || password.length < 8 || password.length > 256) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกรหัสผ่านอย่างน้อย 8 ตัวอักษร" },
          { status: 400 }
        );
      }

      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const cleanUsername = username.trim().toLowerCase();
      const fullName = `${cleanFirstName} ${cleanLastName}`;

      if (!ADMIN_USERNAME_PATTERN.test(cleanUsername)) {
        return NextResponse.json(
          { success: false, error: "Username ต้องมี 3-64 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง" },
          { status: 400 }
        );
      }

      // Check duplicate username
      const existing = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` },
          { status: 409 }
        );
      }

      const hashedPassword = await hashPassword(password);

      const admin = await prisma.user.create({
        data: {
          role: "ADMIN",
          username: cleanUsername,
          password: hashedPassword,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          name: fullName,
        },
        select: {
          id: true,
          role: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
          isActive: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        { success: true, message: "เพิ่มแอดมินสำเร็จ", data: admin },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" },
      { status: 500 }
    );
  }
}
