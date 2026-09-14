import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseLabResults } from "@/lib/disease-lab-results";
import { evaluateDoctorDiagnosisWithAI } from "@/lib/server/ai-evaluation";
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

export async function GET(request: NextRequest) {
  try {
    const classroomId = request.nextUrl.searchParams.get("classroomId")?.trim();
    const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
    const simulationId = request.nextUrl.searchParams.get("simulationId")?.trim();
    if (!classroomId || !groupId || !simulationId) return jsonError("กรุณาระบุรอบจำลอง ห้องเรียน และห้องตรวจ", 400);
    const simulation = await getRunningSimulationScope({ simulationId, classroomId, groupId });
    if (!simulation) return jsonError("รอบจำลองยังไม่เริ่ม หรือข้อมูลห้องไม่ถูกต้อง", 409);

    const diagnoses = await prisma.doctorDiagnosis.findMany({
      where: {
        classroomId,
        groupId,
        simulationId,
        pharmacyDispense: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        queueNumber: true,
        patientCardId: true,
        nurseInterviewId: true,
        doctorName: true,
        patientPrefix: true,
        patientFirstName: true,
        patientLastName: true,
        age: true,
        gender: true,
        maritalStatus: true,
        diseaseName: true,
        doctorDiagnosis: true,
        createdAt: true,
        nurseInterview: {
          select: {
            weightKg: true,
            heightCm: true,
            systolicBp: true,
            diastolicBp: true,
            pulseBpm: true,
            chronicDiseaseStatus: true,
            chronicDiseaseDetails: true,
            chiefComplaint: true,
            symptomDescription: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: diagnoses.map((d) => {
          const { nurseInterview, ...rest } = d;
          return {
            ...rest,
            createdAt: d.createdAt.toISOString(),
            weightKg: nurseInterview?.weightKg ? nurseInterview.weightKg.toNumber() : null,
            heightCm: nurseInterview?.heightCm ? nurseInterview.heightCm.toNumber() : null,
            systolicBp: nurseInterview?.systolicBp ?? null,
            diastolicBp: nurseInterview?.diastolicBp ?? null,
            pulseBpm: nurseInterview?.pulseBpm ?? null,
            chronicDiseaseStatus: nurseInterview?.chronicDiseaseStatus ?? null,
            chronicDiseaseDetails: nurseInterview?.chronicDiseaseDetails ?? null,
            chiefComplaint: nurseInterview?.chiefComplaint ?? null,
            symptomDescription: nurseInterview?.symptomDescription ?? null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching doctor diagnoses:", error);
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
    const doctorId = requiredText(body.doctorId, "ผู้บันทึก");
    const classroomId = requiredText(body.classroomId, "ห้องเรียน");
    const groupId = requiredText(body.groupId, "ห้องตรวจ");
    const simulationId = requiredText(body.simulationId, "รอบจำลอง");
    const nurseInterviewId = requiredText(body.nurseInterviewId, "ผู้ป่วย");
    const diseaseId = requiredText(body.diseaseId, "โรคที่วินิจฉัย");
    const doctorDiagnosis = requiredText(body.doctorDiagnosis, "การวินิจฉัยโรคของแพทย์", 5000);
    const treatmentPlan = optionalText(body.treatmentPlan, 5000);
    const notes = optionalText(body.notes, 5000);

    const [doctor, classroom, group, nurseInterview, disease, simulation] = await Promise.all([
      prisma.user.findFirst({
        where: { id: doctorId, role: "STUDENT", isActive: true },
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
          weightKg: true,
          heightCm: true,
          systolicBp: true,
          diastolicBp: true,
          pulseBpm: true,
          chronicDiseaseStatus: true,
          chronicDiseaseDetails: true,
          chiefComplaint: true,
          symptomDescription: true,
          notes: true,
          patientCard: {
            select: {
              diseaseCode: true,
            },
          },
          labResult: {
            select: { id: true, labItems: true, notes: true },
          },
        },
      }),
      prisma.disease.findFirst({
        where: { id: diseaseId, isActive: true },
        select: { id: true, code: true, name: true, symptoms: true },
      }),
      getRunningSimulationParticipant({
        simulationId,
        studentId: doctorId,
        classroomId,
        groupId,
        role: "doctor",
      }),
    ]);

    if (!doctor || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลแพทย์ ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }
    if (!nurseInterview) {
      return jsonError("ผู้ป่วยรายนี้ได้รับการตรวจวินิจฉัยแล้ว หรือไม่อยู่ในห้องตรวจนี้", 409);
    }
    if (!disease) {
      return jsonError("ไม่พบข้อมูลโรคที่เลือกในระบบ หรือโรคนี้ไม่ได้เปิดใช้งาน", 400);
    }
    if (!nurseInterview.labResult) {
      return jsonError("ผู้ป่วยรายนี้ยังไม่มีผลตรวจจากเทคนิคการแพทย์ กรุณารอผลแล็บก่อน", 409);
    }

    const labItems = parseLabResults(nurseInterview.labResult.labItems);

    const correctDiseaseCode = (nurseInterview.patientCard?.diseaseCode || "").trim().toLowerCase();
    const selectedDiseaseCode = (disease.code || "").trim().toLowerCase();
    const isDiseaseCorrect = Boolean(
      correctDiseaseCode && selectedDiseaseCode && correctDiseaseCode === selectedDiseaseCode
    );

    let evaluationScore: number | null = 0;
    let aiFeedback: string | null = "";
    let aiStrengths: string | null = "";
    let aiModel: string | null = null;
    let aiAvailable = true;

    if (!isDiseaseCorrect) {
      evaluationScore = 0;
      aiFeedback = `ผลการวินิจฉัยโรคไม่ถูกต้อง (ได้ 0/10 คะแนน) เนื่องจากโรคที่เลือก (${disease.name}) ไม่ตรงกับรหัสโรคของเคสนี้`;
      aiStrengths = "ยังไม่พบจุดเด่นเนื่องจากเลือกโรคไม่ถูกต้อง โปรดสังเกตอาการสำคัญและสัญญาณชีพของผู้ป่วยให้รอบคอบในเคสถัดไป";
      aiAvailable = true;
    } else {
      const aiResult = await evaluateDoctorDiagnosisWithAI({
        patient: {
          prefix: nurseInterview.patientPrefix,
          firstName: nurseInterview.patientFirstName,
          lastName: nurseInterview.patientLastName,
          age: nurseInterview.age,
          gender: nurseInterview.gender,
          maritalStatus: nurseInterview.maritalStatus,
          weightKg: nurseInterview.weightKg ? nurseInterview.weightKg.toNumber() : null,
          heightCm: nurseInterview.heightCm ? nurseInterview.heightCm.toNumber() : null,
          systolicBp: nurseInterview.systolicBp,
          diastolicBp: nurseInterview.diastolicBp,
          pulseBpm: nurseInterview.pulseBpm,
          chronicDiseaseStatus: nurseInterview.chronicDiseaseStatus,
          chronicDiseaseDetails: nurseInterview.chronicDiseaseDetails,
          chiefComplaint: nurseInterview.chiefComplaint,
          symptomDescription: nurseInterview.symptomDescription,
          nurseNotes: nurseInterview.notes,
        },
        lab: {
          items: labItems,
          notes: nurseInterview.labResult.notes,
        },
        disease: {
          code: disease.code,
          name: disease.name,
          symptoms: disease.symptoms,
        },
        doctorDiagnosis: {
          diagnosisText: doctorDiagnosis,
          treatmentPlan,
          notes,
        },
      });

      if (aiResult.success && aiResult.score !== null) {
        evaluationScore = aiResult.score;
        aiFeedback = aiResult.feedback;
        aiStrengths = aiResult.strengths;
        aiModel = aiResult.modelUsed || null;
        aiAvailable = true;
      } else {
        // Safety Fallback: AI unavailable, record disease is correct and save immediately
        evaluationScore = null;
        aiFeedback = "ระบบ AI ตรวจประเมินไม่สามารถใช้งานได้ชั่วคราว (ระบบได้บันทึกผลการวินิจฉัยโรคที่ถูกต้องเรียบร้อยแล้ว)";
        aiStrengths = null;
        aiModel = null;
        aiAvailable = false;
      }
    }

    const diagnosisRecord = await prisma.doctorDiagnosis.create({
      data: {
        patientCardId: nurseInterview.patientCardId,
        queueNumber: nurseInterview.queueNumber,
        nurseInterviewId: nurseInterview.id,
        labResultId: nurseInterview.labResult.id,
        doctorId: doctor.id,
        classroomId: classroom.id,
        groupId: group.id,
        simulationId,
        doctorName: doctor.name,
        classroomName: classroom.name,
        groupName: group.name,
        patientPrefix: nurseInterview.patientPrefix,
        patientFirstName: nurseInterview.patientFirstName,
        patientLastName: nurseInterview.patientLastName,
        age: nurseInterview.age,
        gender: nurseInterview.gender,
        maritalStatus: nurseInterview.maritalStatus,
        diseaseId: disease.id,
        diseaseCode: disease.code,
        diseaseName: disease.name,
        doctorDiagnosis,
        treatmentPlan,
        notes,
        isCorrect: isDiseaseCorrect,
        evaluationScore,
        aiModel,
        aiFeedback,
        aiStrengths,
        aiEvaluatedAt: aiAvailable && evaluationScore !== null ? new Date() : null,
      },
      select: { id: true, queueNumber: true, createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกผลการวินิจฉัยเรียบร้อยแล้ว",
        data: {
          id: diagnosisRecord.id,
          queueNumber: diagnosisRecord.queueNumber,
          createdAt: diagnosisRecord.createdAt.toISOString(),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("ผู้ป่วยรายนี้ได้รับการตรวจวินิจฉัยแล้ว กรุณาเลือกผู้ป่วยรายอื่น", 409);
    }
    if (error instanceof Error && error.message.startsWith("กรุณา")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.endsWith("ยาวเกินไป")) {
      return jsonError(error.message, 400);
    }

    console.error("Error creating doctor diagnosis:", error);
    return jsonError("เกิดข้อผิดพลาดในการบันทึกผลการวินิจฉัย", 500);
  }
}
