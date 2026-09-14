import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseLabResults } from "@/lib/disease-lab-results";
import { getLabPanels, getNurseInterviewsAwaitingLab } from "@/lib/server/play-data";
import {
  getRunningSimulationParticipant,
  getRunningSimulationScope,
} from "@/lib/server/simulation-data";

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

/** คิวผู้ป่วยที่รอผลแล็บ พร้อมชุดตรวจที่เลือกส่งได้ */
export async function GET(request: NextRequest) {
  try {
    const classroomId = request.nextUrl.searchParams.get("classroomId")?.trim();
    const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
    const simulationId = request.nextUrl.searchParams.get("simulationId")?.trim();
    if (!classroomId || !groupId || !simulationId) return jsonError("กรุณาระบุรอบจำลอง ห้องเรียน และห้องตรวจ", 400);
    const simulation = await getRunningSimulationScope({ simulationId, classroomId, groupId });
    if (!simulation) return jsonError("รอบจำลองยังไม่เริ่ม หรือข้อมูลห้องไม่ถูกต้อง", 409);

    const includePanels = request.nextUrl.searchParams.get("includePanels") === "1";
    const [interviews, panels] = await Promise.all([
      getNurseInterviewsAwaitingLab(classroomId, groupId, simulationId),
      includePanels ? getLabPanels() : Promise.resolve(null),
    ]);

    return NextResponse.json(
      { success: true, data: interviews, ...(panels ? { panels } : {}) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching lab queue:", error);
    return jsonError("เกิดข้อผิดพลาดในการดึงรายการผู้ป่วยที่รอผลแล็บ", 500);
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
    const medTechId = requiredText(body.medTechId, "ผู้บันทึก");
    const classroomId = requiredText(body.classroomId, "ห้องเรียน");
    const groupId = requiredText(body.groupId, "ห้องตรวจ");
    const simulationId = requiredText(body.simulationId, "รอบจำลอง");
    const nurseInterviewId = requiredText(body.nurseInterviewId, "ผู้ป่วย");
    const panelDiseaseId = requiredText(body.panelDiseaseId, "ชุดผลตรวจ");
    const notes = optionalText(body.notes, 5000);

    const [medTech, classroom, group, nurseInterview, panelDisease, simulation] = await Promise.all([
      prisma.user.findFirst({
        where: { id: medTechId, role: "STUDENT", isActive: true },
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
      prisma.nurseInterview.findFirst({
        where: {
          id: nurseInterviewId,
          classroomId,
          groupId,
          simulationId,
          labResult: null,
          doctorDiagnosis: null,
        },
        select: {
          id: true,
          queueNumber: true,
          patientCardId: true,
          patientPrefix: true,
          patientFirstName: true,
          patientLastName: true,
          age: true,
          gender: true,
          maritalStatus: true,
          patientCard: { select: { diseaseCode: true } },
        },
      }),
      prisma.disease.findFirst({
        where: { id: panelDiseaseId, isActive: true },
        select: { id: true, code: true, name: true, labResults: true },
      }),
      getRunningSimulationParticipant({
        simulationId,
        studentId: medTechId,
        classroomId,
        groupId,
        role: "medtech",
      }),
    ]);

    if (!medTech || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลผู้บันทึก ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }
    if (!nurseInterview) {
      return jsonError("ผู้ป่วยรายนี้ถูกส่งผลแล็บแล้ว หรือไม่อยู่ในห้องตรวจนี้", 409);
    }
    if (!panelDisease) {
      return jsonError("ไม่พบชุดผลตรวจที่เลือก หรือชุดนี้ไม่ได้เปิดใช้งาน", 400);
    }

    const labItems = parseLabResults(panelDisease.labResults);
    if (labItems.length === 0) {
      return jsonError("ชุดผลตรวจนี้ยังไม่มีรายการผลตรวจ กรุณาเลือกชุดอื่น", 400);
    }

    const expectedDiseaseCode = (nurseInterview.patientCard?.diseaseCode || "").trim().toLowerCase();
    const selectedDiseaseCode = (panelDisease.code || "").trim().toLowerCase();
    const isCorrect = expectedDiseaseCode
      ? expectedDiseaseCode === selectedDiseaseCode
      : null;

    const labResult = await prisma.labResult.create({
      data: {
        patientCardId: nurseInterview.patientCardId,
        nurseInterviewId: nurseInterview.id,
        queueNumber: nurseInterview.queueNumber,
        medTechId: medTech.id,
        classroomId: classroom.id,
        groupId: group.id,
        simulationId,
        medTechName: medTech.name,
        classroomName: classroom.name,
        groupName: group.name,
        patientPrefix: nurseInterview.patientPrefix,
        patientFirstName: nurseInterview.patientFirstName,
        patientLastName: nurseInterview.patientLastName,
        age: nurseInterview.age,
        gender: nurseInterview.gender,
        maritalStatus: nurseInterview.maritalStatus,
        panelDiseaseId: panelDisease.id,
        panelDiseaseCode: panelDisease.code,
        panelDiseaseName: panelDisease.name,
        labItems: labItems as unknown as Prisma.InputJsonValue,
        isCorrect,
        notes,
      },
      select: { id: true, queueNumber: true, createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "ส่งผลตรวจทางห้องปฏิบัติการเรียบร้อยแล้ว",
        data: {
          id: labResult.id,
          queueNumber: labResult.queueNumber,
          itemCount: labItems.length,
          createdAt: labResult.createdAt.toISOString(),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("ผู้ป่วยรายนี้ถูกส่งผลแล็บแล้ว กรุณาเลือกผู้ป่วยรายอื่น", 409);
    }
    if (error instanceof Error && error.message.startsWith("กรุณา")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.endsWith("ยาวเกินไป")) {
      return jsonError(error.message, 400);
    }

    console.error("Error creating lab result:", error);
    return jsonError("เกิดข้อผิดพลาดในการส่งผลตรวจทางห้องปฏิบัติการ", 500);
  }
}
