import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { normalizeLabResultsInput, parseLabResults } from "@/lib/disease-lab-results";
import {
  PHARMACY_HORMONE_LABEL_MAX_LENGTH,
  PHARMACY_TREATMENT_LABEL_MAX_LENGTH,
  normalizePharmacyChoiceInput,
} from "@/lib/pharmacy-choices";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;
    const disease = await prisma.disease.findUnique({
      where: { id },
    });

    if (!disease) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลโรคนี้ในระบบ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...disease, labResults: parseLabResults(disease.labResults) },
    });
  } catch (error) {
    console.error("Error fetching disease:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลโรค" },
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
        { success: false, error: "ไม่พบรหัสโรคที่ต้องการแก้ไข" },
        { status: 400 }
      );
    }

    const existingDisease = await prisma.disease.findUnique({
      where: { id },
    });

    if (!existingDisease) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลโรคนี้ในระบบ" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { code, name, symptoms, labResults, isActive } = body;

    const dataToUpdate: {
      code?: string;
      name?: string;
      symptoms?: string;
      labResults?: Prisma.InputJsonValue;
      hormoneChoiceKey?: string | null;
      hormoneChoiceLabel?: string | null;
      treatmentChoiceKey?: string | null;
      treatmentChoiceLabel?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof isActive === "boolean") {
      dataToUpdate.isActive = isActive;
    }

    if (code !== undefined) {
      const cleanCode = code.trim();
      if (!cleanCode) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกรหัสโรค" },
          { status: 400 }
        );
      }
      if (cleanCode !== existingDisease.code) {
        const duplicate = await prisma.disease.findUnique({
          where: { code: cleanCode },
        });
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { success: false, error: `รหัสโรค "${cleanCode}" มีอยู่ในระบบแล้ว` },
            { status: 409 }
          );
        }
      }
      dataToUpdate.code = cleanCode;
    }

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกชื่อโรค" },
          { status: 400 }
        );
      }
      dataToUpdate.name = cleanName;
    }

    if (symptoms !== undefined) {
      const cleanSymptoms = symptoms.trim();
      if (!cleanSymptoms) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกข้อมูลอาการของโรค" },
          { status: 400 }
        );
      }
      dataToUpdate.symptoms = cleanSymptoms;
    }

    if (labResults !== undefined) {
      try {
        dataToUpdate.labResults = normalizeLabResultsInput(
          labResults
        ) as unknown as Prisma.InputJsonValue;
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
    }

    // ตัวเลือกของห้องยาส่งมาเป็นคู่เสมอ (ตัวอักษร + ข้อความ) เว้นว่างทั้งคู่ = ล้างเฉลยของโรคนี้
    if (body.hormoneChoiceKey !== undefined || body.hormoneChoiceLabel !== undefined) {
      try {
        const hormone = normalizePharmacyChoiceInput(
          body.hormoneChoiceKey,
          body.hormoneChoiceLabel,
          {
            fieldLabel: "ตัวเลือกความผิดปกติของฮอร์โมน (A-U)",
            labelMaxLength: PHARMACY_HORMONE_LABEL_MAX_LENGTH,
          }
        );
        dataToUpdate.hormoneChoiceKey = hormone.key;
        dataToUpdate.hormoneChoiceLabel = hormone.label;
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "ข้อมูลตัวเลือกของห้องยาไม่ถูกต้อง",
          },
          { status: 400 }
        );
      }
    }

    if (body.treatmentChoiceKey !== undefined || body.treatmentChoiceLabel !== undefined) {
      try {
        const treatment = normalizePharmacyChoiceInput(
          body.treatmentChoiceKey,
          body.treatmentChoiceLabel,
          {
            fieldLabel: "ตัวเลือกยา/การรักษา (ก-ธ)",
            labelMaxLength: PHARMACY_TREATMENT_LABEL_MAX_LENGTH,
          }
        );
        dataToUpdate.treatmentChoiceKey = treatment.key;
        dataToUpdate.treatmentChoiceLabel = treatment.label;
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "ข้อมูลตัวเลือกของห้องยาไม่ถูกต้อง",
          },
          { status: 400 }
        );
      }
    }

    const updatedDisease = await prisma.disease.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลโรคสำเร็จ",
      data: { ...updatedDisease, labResults: parseLabResults(updatedDisease.labResults) },
    });
  } catch (error) {
    console.error("Error updating disease:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกการแก้ไขข้อมูลโรค" },
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
        { success: false, error: "ไม่พบรหัสโรคที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const existingDisease = await prisma.disease.findUnique({
      where: { id },
    });

    if (!existingDisease) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลโรคนี้ในระบบ" },
        { status: 404 }
      );
    }

    await prisma.disease.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "ลบข้อมูลโรคเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Error deleting disease:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูลโรค" },
      { status: 500 }
    );
  }
}
