import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const status = searchParams.get("status"); // ALL, ACTIVE, INACTIVE

    const whereClause: {
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string };
        description?: { contains: string };
      }>;
    } = {};

    if (status === "ACTIVE") {
      whereClause.isActive = true;
    } else if (status === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (query && query.trim()) {
      const q = query.trim();
      const orConditions: Array<{
        name?: { contains: string };
        description?: { contains: string };
      }> = [
        { name: { contains: q } },
        { description: { contains: q } },
      ];

      whereClause.OR = orConditions;
    }

    const [classrooms, statusCounts] = await Promise.all([
      prisma.classroom.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.classroom.groupBy({
        by: ["isActive"],
        _count: { _all: true },
      }),
    ]);

    let activeCount = 0;
    let inactiveCount = 0;
    for (const item of statusCounts) {
      if (item.isActive) activeCount = item._count._all;
      else inactiveCount = item._count._all;
    }
    const totalCount = activeCount + inactiveCount;

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      data: classrooms,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลห้องเรียน" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกชื่อห้องเรียน" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanDescription = description && typeof description === "string" ? description.trim() : null;

    // Check duplicate classroom name
    const existing = await prisma.classroom.findFirst({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `มีห้องเรียนชื่อ "${cleanName}" อยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: cleanName,
        description: cleanDescription,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "สร้างห้องเรียนสำเร็จ",
        data: classroom,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating classroom:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลห้องเรียน" },
      { status: 500 }
    );
  }
}
