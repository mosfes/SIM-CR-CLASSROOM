import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { normalizeLabResultsInput, parseLabResults } from "@/lib/disease-lab-results";
import { normalizeNurseChoiceInput } from "@/lib/nurse-choices";
import {
  PHARMACY_HORMONE_LABEL_MAX_LENGTH,
  PHARMACY_TREATMENT_LABEL_MAX_LENGTH,
  normalizePharmacyChoiceInput,
} from "@/lib/pharmacy-choices";

/** ตรวจตัวเลือก A-U และ ก-ธ ที่ครูกรอกให้กับโรคหนึ่ง ๆ */
function normalizeDiseaseChoices(body: Record<string, unknown>) {
  const hormone = normalizePharmacyChoiceInput(body.hormoneChoiceKey, body.hormoneChoiceLabel, {
    fieldLabel: "ตัวเลือกความผิดปกติของฮอร์โมน (A-U)",
    labelMaxLength: PHARMACY_HORMONE_LABEL_MAX_LENGTH,
  });
  const treatment = normalizePharmacyChoiceInput(body.treatmentChoiceKey, body.treatmentChoiceLabel, {
    fieldLabel: "ตัวเลือกยา/การรักษา (ก-ธ)",
    labelMaxLength: PHARMACY_TREATMENT_LABEL_MAX_LENGTH,
  });

  return {
    hormoneChoiceKey: hormone.key,
    hormoneChoiceLabel: hormone.label,
    treatmentChoiceKey: treatment.key,
    treatmentChoiceLabel: treatment.label,
  };
}

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
        code?: { contains: string };
        name?: { contains: string };
        symptoms?: { contains: string };
      }>;
    } = {};

    if (status === "ACTIVE") {
      whereClause.isActive = true;
    } else if (status === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { code: { contains: q } },
        { name: { contains: q } },
        { symptoms: { contains: q } },
      ];
    }

    const [diseases, statusCounts] = await Promise.all([
      prisma.disease.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
      prisma.disease.groupBy({
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
      data: diseases.map((disease) => ({
        ...disease,
        labResults: parseLabResults(disease.labResults),
      })),
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching diseases:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลโรค" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { csrf: true });
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const { code, name, symptoms, labResults, isActive = true } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกรหัสโรค" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกชื่อโรค" },
        { status: 400 }
      );
    }

    if (!symptoms || !symptoms.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกข้อมูลอาการของโรค" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim();
    const cleanName = name.trim();
    const cleanSymptoms = symptoms.trim();

    let choices;
    try {
      choices = {
        ...normalizeDiseaseChoices(body),
        // เฉลยของสถานีพยาบาล เว้นว่างได้ (ข้อความเดียวกันใช้ซ้ำกับหลายโรคได้)
        endocrineGland: normalizeNurseChoiceInput(body.endocrineGland, "ต่อมไร้ท่อที่ผิดปกติ"),
        abnormalHormone: normalizeNurseChoiceInput(body.abnormalHormone, "ฮอร์โมนที่ผิดปกติ"),
      };
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "ข้อมูลตัวเลือกของห้องยาไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    let cleanLabResults;
    try {
      cleanLabResults = normalizeLabResultsInput(labResults);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "ข้อมูลผลตรวจทางห้องปฏิบัติการไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    // Check duplicate disease code
    const existing = await prisma.disease.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `รหัสโรค "${cleanCode}" มีอยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }

    const disease = await prisma.disease.create({
      data: {
        code: cleanCode,
        name: cleanName,
        symptoms: cleanSymptoms,
        labResults: cleanLabResults as unknown as Prisma.InputJsonValue,
        ...choices,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "เพิ่มข้อมูลโรคสำเร็จ",
        data: { ...disease, labResults: parseLabResults(disease.labResults) },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating disease:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลโรค" },
      { status: 500 }
    );
  }
}
