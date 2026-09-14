import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAvailableNurseInterviews,
  getNurseInterviewsAwaitingLab,
} from "@/lib/server/play-data";
import {
  getRunningSimulationParticipant,
  getRunningSimulationScope,
} from "@/lib/server/simulation-data";

const CHRONIC_DISEASE_STATUSES = new Set(["NONE", "UNKNOWN", "YES"]);

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

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleanValue = value.trim();
  if (!cleanValue) return null;
  if (cleanValue.length > maxLength) throw new Error("ข้อความยาวเกินไป");
  return cleanValue;
}

function requiredNumber(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false
) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "string" && !value.trim())
  ) {
    throw new Error(`กรุณากรอก${label}ให้ถูกต้อง`);
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
    throw new Error(`กรุณากรอก${label}ให้ถูกต้อง`);
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const classroomId = request.nextUrl.searchParams.get("classroomId")?.trim();
    const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
    const simulationId = request.nextUrl.searchParams.get("simulationId")?.trim();
    if (!classroomId || !groupId || !simulationId) return jsonError("กรุณาระบุรอบจำลอง ห้องเรียน และห้องตรวจ", 400);
    const simulation = await getRunningSimulationScope({ simulationId, classroomId, groupId });
    if (!simulation) return jsonError("รอบจำลองยังไม่เริ่ม หรือข้อมูลห้องไม่ถูกต้อง", 409);

    // stage=lab คือคิวของเทคนิคการแพทย์ (ยังไม่ส่งผลแล็บ)
    // ค่าเริ่มต้นคือคิวของแพทย์ (มีผลแล็บแล้ว และยังไม่ถูกวินิจฉัย)
    const stage = request.nextUrl.searchParams.get("stage")?.trim();
    const data =
      stage === "lab"
        ? await getNurseInterviewsAwaitingLab(classroomId, groupId, simulationId)
        : await getAvailableNurseInterviews(classroomId, groupId, simulationId);

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching nurse interviews:", error);
    return jsonError("เกิดข้อผิดพลาดในการดึงรายการผู้ป่วย", 500);
  }
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
    const nurseId = requiredText(body.nurseId, "ผู้บันทึก");
    const classroomId = requiredText(body.classroomId, "ห้องเรียน");
    const groupId = requiredText(body.groupId, "ห้องตรวจ");
    const simulationId = requiredText(body.simulationId, "รอบจำลอง");
    const patientCardId = requiredText(body.patientCardId, "บัตรผู้ป่วย");
    const chronicDiseaseStatus = requiredText(body.chronicDiseaseStatus, "ข้อมูลโรคประจำตัว");
    const chronicDiseaseDetails = optionalText(body.chronicDiseaseDetails, 2000);

    if (!CHRONIC_DISEASE_STATUSES.has(chronicDiseaseStatus)) {
      return jsonError("ข้อมูลโรคประจำตัวไม่ถูกต้อง", 400);
    }
    if (chronicDiseaseStatus === "YES" && !chronicDiseaseDetails) {
      return jsonError("กรุณาระบุโรคประจำตัว", 400);
    }

    const weightKg = requiredNumber(body.weightKg, "น้ำหนัก", 1, 500);
    const heightCm = requiredNumber(body.heightCm, "ส่วนสูง", 30, 250);
    const systolicBp = requiredNumber(body.systolicBp, "ความดันตัวบน", 40, 300, true);
    const diastolicBp = requiredNumber(body.diastolicBp, "ความดันตัวล่าง", 20, 200, true);
    if (diastolicBp >= systolicBp) {
      return jsonError("ความดันตัวบนต้องมากกว่าความดันตัวล่าง", 400);
    }
    const pulseBpm = requiredNumber(body.pulseBpm, "ชีพจร", 20, 250, true);
    const chiefComplaint = requiredText(body.chiefComplaint, "สาเหตุที่มาพบแพทย์", 2000);
    const symptomDescription = requiredText(body.symptomDescription, "ลักษณะอาการ", 5000);
    const notes = optionalText(body.notes, 5000);

    const [nurse, classroom, group, patientCard, simulation] = await Promise.all([
      prisma.user.findFirst({
        where: { id: nurseId, role: "STUDENT", isActive: true },
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
      prisma.patientCard.findFirst({
        where: {
          id: patientCardId,
          classroomId,
          groupId,
          simulationId,
          nurseInterview: null,
        },
        select: {
          id: true,
          queueNumber: true,
          patientPrefix: true,
          patientFirstName: true,
          patientLastName: true,
          age: true,
          gender: true,
          maritalStatus: true,
        },
      }),
      getRunningSimulationParticipant({
        simulationId,
        studentId: nurseId,
        classroomId,
        groupId,
        role: "nurse",
      }),
    ]);

    if (!nurse || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลผู้บันทึก ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }
    if (!patientCard) {
      return jsonError("บัตรผู้ป่วยนี้ถูกซักประวัติแล้ว หรือไม่อยู่ในห้องตรวจนี้", 409);
    }

    const interview = await prisma.nurseInterview.create({
      data: {
        patientCardId: patientCard.id,
        queueNumber: patientCard.queueNumber,
        nurseId: nurse.id,
        classroomId: classroom.id,
        groupId: group.id,
        simulationId,
        nurseName: nurse.name,
        classroomName: classroom.name,
        groupName: group.name,
        patientPrefix: patientCard.patientPrefix,
        patientFirstName: patientCard.patientFirstName,
        patientLastName: patientCard.patientLastName,
        age: patientCard.age,
        gender: patientCard.gender,
        maritalStatus: patientCard.maritalStatus,
        weightKg,
        heightCm,
        systolicBp,
        diastolicBp,
        pulseBpm,
        chronicDiseaseStatus,
        chronicDiseaseDetails: chronicDiseaseStatus === "YES" ? chronicDiseaseDetails : null,
        chiefComplaint,
        symptomDescription,
        notes,
      },
      select: { id: true, queueNumber: true, createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกแบบซักประวัติเรียบร้อยแล้ว",
        data: {
          id: interview.id,
          queueNumber: interview.queueNumber,
          createdAt: interview.createdAt.toISOString(),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("บัตรผู้ป่วยนี้ถูกซักประวัติแล้ว กรุณาเลือกบัตรอื่น", 409);
    }
    if (error instanceof Error && error.message.startsWith("กรุณา")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.endsWith("ยาวเกินไป")) {
      return jsonError(error.message, 400);
    }

    console.error("Error creating nurse interview:", error);
    return jsonError("เกิดข้อผิดพลาดในการบันทึกแบบซักประวัติ", 500);
  }
}
