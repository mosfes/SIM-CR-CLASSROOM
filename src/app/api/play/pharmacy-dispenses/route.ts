import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRunningSimulationParticipant } from "@/lib/server/simulation-data";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const expectedOrigin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : request.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function requiredText(value: unknown, label: string, maxLength = 191) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`กรุณากรอก${label}`);
  }

  const cleanValue = value.trim();
  if (cleanValue.length > maxLength) {
    throw new Error(`${label}ยาวเกินไป`);
  }
  return cleanValue;
}

interface MedicineItemInput {
  name: unknown;
  tabletCount: unknown;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("คำขอไม่ผ่านการตรวจสอบความปลอดภัย", 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError("รองรับเฉพาะข้อมูล JSON", 415);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const pharmacistId = requiredText(body.pharmacistId, "ผู้บันทึก");
    const classroomId = requiredText(body.classroomId, "ห้องเรียน");
    const groupId = requiredText(body.groupId, "ห้องตรวจ");
    const simulationId = requiredText(body.simulationId, "รอบจำลอง");
    const doctorDiagnosisId = requiredText(body.doctorDiagnosisId, "ผู้ป่วย");

    const rawMedicines = body.medicines;
    if (!Array.isArray(rawMedicines) || rawMedicines.length === 0) {
      return jsonError("กรุณาระบุรายการยาอย่างน้อย 1 รายการ", 400);
    }

    const cleanMedicines: { name: string; tabletCount: number }[] = [];
    let totalTablets = 0;

    for (let i = 0; i < rawMedicines.length; i++) {
      const item = rawMedicines[i] as MedicineItemInput;
      if (!item || typeof item !== "object") {
        return jsonError(`ข้อมูลรายการยาที่ ${i + 1} ไม่ถูกต้อง`, 400);
      }

      if (typeof item.name !== "string" || !item.name.trim()) {
        return jsonError(`กรุณากรอกชื่อ/รายการยาสำหรับรายการที่ ${i + 1}`, 400);
      }
      const name = item.name.trim();
      if (name.length > 191) {
        return jsonError(`ชื่อยาที่ ${i + 1} ยาวเกินไป`, 400);
      }

      const count = Number(item.tabletCount);
      if (!Number.isInteger(count) || count < 1 || count > 10000) {
        return jsonError(`กรุณาระบุจำนวนเม็ดที่ถูกต้องสำหรับ ${name} (1-10,000 เม็ด)`, 400);
      }

      cleanMedicines.push({ name, tabletCount: count });
      totalTablets += count;
    }

    const [pharmacist, classroom, group, doctorDiagnosis, simulation] = await Promise.all([
      prisma.user.findFirst({
        where: { id: pharmacistId, role: "STUDENT", isActive: true },
        select: { id: true, name: true },
      }),
      prisma.classroom.findFirst({
        where: { id: classroomId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.classroomGroup.findFirst({
        where: { id: groupId, classroomId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.doctorDiagnosis.findFirst({
        where: {
          id: doctorDiagnosisId,
          classroomId,
          groupId,
          simulationId,
          pharmacyDispense: null,
        },
        select: {
          id: true,
          queueNumber: true,
          patientCardId: true,
          nurseInterviewId: true,
          patientPrefix: true,
          patientFirstName: true,
          patientLastName: true,
          age: true,
          gender: true,
          maritalStatus: true,
          diseaseName: true,
          doctorDiagnosis: true,
        },
      }),
      getRunningSimulationParticipant({
        simulationId,
        studentId: pharmacistId,
        classroomId,
        groupId,
        role: "pharmacist",
      }),
    ]);

    if (!pharmacist || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลเภสัชกร ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }
    if (!doctorDiagnosis) {
      return jsonError("ผู้ป่วยรายนี้ได้รับการจ่ายยาแล้ว หรือไม่อยู่ในห้องตรวจนี้", 409);
    }

    const dispenseRecord = await prisma.pharmacyDispense.create({
      data: {
        patientCardId: doctorDiagnosis.patientCardId,
        nurseInterviewId: doctorDiagnosis.nurseInterviewId,
        doctorDiagnosisId: doctorDiagnosis.id,
        queueNumber: doctorDiagnosis.queueNumber,
        pharmacistId: pharmacist.id,
        classroomId: classroom.id,
        groupId: group.id,
        simulationId,
        pharmacistName: pharmacist.name,
        classroomName: classroom.name,
        groupName: group.name,
        patientPrefix: doctorDiagnosis.patientPrefix,
        patientFirstName: doctorDiagnosis.patientFirstName,
        patientLastName: doctorDiagnosis.patientLastName,
        age: doctorDiagnosis.age,
        gender: doctorDiagnosis.gender,
        maritalStatus: doctorDiagnosis.maritalStatus,
        diseaseName: doctorDiagnosis.diseaseName,
        doctorDiagnosisText: doctorDiagnosis.doctorDiagnosis,
        medicines: cleanMedicines,
        totalTablets,
      },
      select: { id: true, queueNumber: true, createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกการจ่ายยาเรียบร้อยแล้ว",
        data: {
          id: dispenseRecord.id,
          queueNumber: dispenseRecord.queueNumber,
          createdAt: dispenseRecord.createdAt.toISOString(),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("ผู้ป่วยรายนี้ได้รับการจ่ายยาแล้ว กรุณาเลือกผู้ป่วยรายอื่น", 409);
    }
    if (error instanceof Error && error.message.startsWith("กรุณา")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.endsWith("ยาวเกินไป")) {
      return jsonError(error.message, 400);
    }

    console.error("Error creating pharmacy dispense:", error);
    return jsonError("เกิดข้อผิดพลาดในการบันทึกการจ่ายยา", 500);
  }
}
