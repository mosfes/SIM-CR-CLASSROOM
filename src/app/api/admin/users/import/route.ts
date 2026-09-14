import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";

interface StudentImportItem {
  studentId: string;
  name: string;
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const { students, mode = "skip" } = body as {
      students: StudentImportItem[];
      mode?: "skip" | "update";
    };

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลนักเรียนที่ต้องการนำเข้า" },
        { status: 400 }
      );
    }

    // Clean and validate input list
    const validItems: StudentImportItem[] = [];
    const seenIds = new Set<string>();

    for (const item of students) {
      const cleanId = String(item.studentId || "").trim();
      const cleanName = String(item.name || "").trim().replace(/\s+/g, " ");

      if (cleanId && cleanName && !seenIds.has(cleanId)) {
        seenIds.add(cleanId);
        validItems.push({
          studentId: cleanId,
          name: cleanName,
        });
      }
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลนักเรียนไม่ถูกต้องหรือไม่มีรหัส/ชื่อนักเรียน" },
        { status: 400 }
      );
    }

    // Check which students already exist in database
    const allIds = validItems.map((s) => s.studentId);
    const existingUsers = await prisma.user.findMany({
      where: {
        studentId: { in: allIds },
      },
      select: {
        id: true,
        studentId: true,
      },
    });

    const existingSet = new Set(existingUsers.map((u) => u.studentId));

    const newItems = validItems.filter((s) => !existingSet.has(s.studentId));
    const existingItems = validItems.filter((s) => existingSet.has(s.studentId));

    // Insert new students
    if (newItems.length > 0) {
      await prisma.user.createMany({
        data: newItems.map((s) => ({
          role: "STUDENT",
          studentId: s.studentId,
          name: s.name,
        })),
        skipDuplicates: true,
      });
    }

    // If mode is update, update existing students' names
    if (mode === "update" && existingItems.length > 0) {
      for (const item of existingItems) {
        await prisma.user.updateMany({
          where: { studentId: item.studentId },
          data: {
            name: item.name,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: newItems.length,
      updatedCount: mode === "update" ? existingItems.length : 0,
      skippedCount: mode === "skip" ? existingItems.length : 0,
      totalCount: validItems.length,
      message: `นำเข้าข้อมูลนักเรียนสำเร็จ ${newItems.length} คน${
        existingItems.length > 0
          ? ` (${mode === "update" ? `อัปเดตข้อมูล ${existingItems.length} คน` : `ข้ามที่มีอยู่แล้ว ${existingItems.length} คน`})`
          : ""
      }`,
    });
  } catch (error) {
    console.error("Error importing students:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการนำเข้าข้อมูลนักเรียน" },
      { status: 500 }
    );
  }
}
