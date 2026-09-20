import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildNurseChoiceOptions,
  evaluateNurseChoice,
  findChoiceOption,
} from "@/lib/nurse-choices";
import {
  getAvailableNurseInterviews,
  getNurseChoiceDecoys,
  getNurseInterviewsAwaitingLab,
} from "@/lib/server/play-data";
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

    const weightKg = requiredNumber(body.weightKg, "น้ำหนัก", 1, 500);
    const heightCm = requiredNumber(body.heightCm, "ส่วนสูง", 30, 250);
    const systolicBp = requiredNumber(body.systolicBp, "ความดันตัวบน", 40, 300, true);
    const diastolicBp = requiredNumber(body.diastolicBp, "ความดันตัวล่าง", 20, 200, true);
    if (diastolicBp >= systolicBp) {
      return jsonError("ความดันตัวบนต้องมากกว่าความดันตัวล่าง", 400);
    }
    const pulseBpm = requiredNumber(body.pulseBpm, "ชีพจร", 20, 250, true);

    const [nurse, classroom, group, patientCard, simulation, choiceDiseases, decoys] = await Promise.all([
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
          diseaseCode: true,
        },
      }),
      getRunningSimulationParticipant({
        simulationId,
        studentId: nurseId,
        classroomId,
        groupId,
        role: "nurse",
      }),
      // เฉลยของสถานีพยาบาลผูกอยู่กับตัวโรค ส่วนตัวลวงเก็บแยก ตัวเลือกที่ยอมรับ = เฉลย + ตัวลวง
      prisma.disease.findMany({
        where: { isActive: true },
        select: { code: true, endocrineGland: true, abnormalHormone: true },
      }),
      getNurseChoiceDecoys(),
    ]);

    if (!nurse || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลผู้บันทึก ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }
    if (!patientCard) {
      return jsonError("บัตรผู้ป่วยนี้ถูกซักประวัติแล้ว หรือไม่อยู่ในห้องตรวจนี้", 409);
    }

    const disease = patientCard.diseaseCode
      ? await prisma.disease.findFirst({
          where: { code: patientCard.diseaseCode, isActive: true },
          select: { symptoms: true },
        })
      : null;
    const symptomDescription = disease?.symptoms.trim();
    if (!symptomDescription) {
      return jsonError("ไม่พบอาการของโรคในบัตรผู้ป่วย กรุณาให้ห้องบัตรเลือกโรคใหม่", 409);
    }

    // ตัวเลือกต่อมไร้ท่อ/ฮอร์โมนเป็นข้อความ และเป็นคำตอบของหลายโรคได้ จึงเทียบด้วยข้อความ
    // ถ้าครูยังไม่ได้กรอกตัวเลือกให้โรคใดเลย จะไม่บังคับตอบ เพื่อไม่ให้การซักประวัติทั้งสถานีค้าง
    const { glands, hormones } = buildNurseChoiceOptions(choiceDiseases, decoys);
    const choicesRequired = glands.length > 0 && hormones.length > 0;
    let glandChoice: string | null = null;
    let hormoneChoice: string | null = null;
    if (choicesRequired) {
      glandChoice = findChoiceOption(glands, body.endocrineGlandChoice);
      if (!glandChoice) {
        return jsonError(
          typeof body.endocrineGlandChoice === "string" && body.endocrineGlandChoice.trim()
            ? "ไม่พบตัวเลือกต่อมไร้ท่อที่เลือก กรุณาเลือกใหม่"
            : "กรุณาเลือกต่อมไร้ท่อที่ผิดปกติ",
          400
        );
      }
      hormoneChoice = findChoiceOption(hormones, body.abnormalHormoneChoice);
      if (!hormoneChoice) {
        return jsonError(
          typeof body.abnormalHormoneChoice === "string" && body.abnormalHormoneChoice.trim()
            ? "ไม่พบตัวเลือกฮอร์โมนที่เลือก กรุณาเลือกใหม่"
            : "กรุณาเลือกฮอร์โมนที่ผิดปกติ",
          400
        );
      }
    }

    // ให้คะแนนเทียบกับเฉลยของโรคที่ห้องบัตรกำหนดไว้ในบัตรผู้ป่วย
    const expectedDisease = choiceDiseases.find((item) => item.code === patientCard.diseaseCode);
    const evaluation = evaluateNurseChoice({
      answer: {
        gland: expectedDisease?.endocrineGland ?? null,
        hormone: expectedDisease?.abnormalHormone ?? null,
      },
      gland: glandChoice,
      hormone: hormoneChoice,
    });

    const interview = await prisma.nurseInterview.create({
      data: {
        queueNumber: patientCard.queueNumber,
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
        chronicDiseaseStatus: "UNKNOWN",
        chronicDiseaseDetails: null,
        // Keep the legacy required column populated for deployments with an older client.
        // The nurse flow no longer collects or displays a separate chief complaint.
        chiefComplaint: symptomDescription,
        symptomDescription,
        notes: null,
        endocrineGlandChoice: glandChoice,
        abnormalHormoneChoice: hormoneChoice,
        isGlandCorrect: evaluation.isGlandCorrect,
        isHormoneCorrect: evaluation.isHormoneCorrect,
        evaluationScore: evaluation.score,
        patientCard: { connect: { id: patientCard.id } },
        nurse: { connect: { id: nurse.id } },
        classroom: { connect: { id: classroom.id } },
        group: { connect: { id: group.id } },
        simulation: { connect: { id: simulation.id } },
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
