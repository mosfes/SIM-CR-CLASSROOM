import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getRunningSimulationParticipant,
  getRunningSimulationScope,
} from "@/lib/server/simulation-data";

const PREFIXES = new Set(["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง", "อื่น ๆ"]);
const GENDERS = new Set(["ชาย", "หญิง", "ไม่ระบุ"]);
const MARITAL_STATUSES = new Set(["โสด", "คู่", "หม้าย", "หย่าร้าง", "แยกกันอยู่"]);
const QUEUE_RESERVATION_ATTEMPTS = 8;

type NewPatientCard = {
  diseaseCode: string;
  clerkId: string;
  classroomId: string;
  groupId: string;
  simulationId: string;
  clerkName: string;
  classroomName: string;
  groupName: string;
  patientPrefix: string;
  patientFirstName: string;
  patientLastName: string;
  age: number;
  gender: string;
  maritalStatus: string;
};

const patientCardResponseSelect = {
  id: true,
  queueNumber: true,
  patientPrefix: true,
  patientFirstName: true,
  patientLastName: true,
  age: true,
  gender: true,
  maritalStatus: true,
  diseaseCode: true,
  createdAt: true,
} as const;

function isRetryableQueueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2025" || error.code === "P2034")
  );
}

function waitForQueueRetry(attempt: number) {
  const backoffMs = Math.min(500, 25 * 2 ** attempt);
  const jitterMs = Math.floor(Math.random() * 30);
  return new Promise<void>((resolve) => {
    setTimeout(resolve, backoffMs + jitterMs);
  });
}

async function ensureSimulationQueueCounter(simulationId: string, groupId: string) {
  const existingCounter = await prisma.simulationQueueCounter.findUnique({
    where: { simulationId_groupId: { simulationId, groupId } },
    select: { simulationId: true },
  });
  if (existingCounter) return;

  // This fallback supports an older session or a group added after the session
  // was created. Normal sessions receive all counters at creation time.
  const latestCard = await prisma.patientCard.aggregate({
    where: { simulationId, groupId },
    _max: { queueNumber: true },
  });

  try {
    await prisma.simulationQueueCounter.create({
      data: {
        simulationId,
        groupId,
        lastQueueNumber: latestCard._max.queueNumber ?? 0,
      },
    });
  } catch (error) {
    // Another concurrent request seeded the counter after our lookup.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }
}

async function createPatientCardWithReservedQueue(input: NewPatientCard) {
  await ensureSimulationQueueCounter(input.simulationId, input.groupId);

  for (let attempt = 0; attempt < QUEUE_RESERVATION_ATTEMPTS; attempt += 1) {
    try {
      // This autocommit increment gives every concurrent request a distinct
      // number without TiDB's optimistic-transaction write conflict. If the
      // following insert fails, a harmless gap is preferable to reusing a number.
      const counter = await prisma.simulationQueueCounter.update({
        where: {
          simulationId_groupId: {
            simulationId: input.simulationId,
            groupId: input.groupId,
          },
        },
        data: { lastQueueNumber: { increment: 1 } },
        select: { lastQueueNumber: true },
      });

      return await prisma.patientCard.create({
        data: { ...input, queueNumber: counter.lastQueueNumber },
        select: patientCardResponseSelect,
      });
    } catch (error) {
      if (!isRetryableQueueError(error) || attempt === QUEUE_RESERVATION_ATTEMPTS - 1) {
        throw error;
      }

      // Spread any transient counter conflicts out without ever reusing a number.
      await waitForQueueRetry(attempt);
    }
  }

  throw new Error("ไม่สามารถจองเลขคิวได้");
}

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

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`กรุณากรอก${label}`);
  const cleanValue = value.trim();
  if (cleanValue.length > 191) throw new Error(`${label}ยาวเกินไป`);
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

    const cards = await prisma.patientCard.findMany({
      where: {
        classroomId,
        groupId,
        simulationId,
        nurseInterview: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        queueNumber: true,
        patientPrefix: true,
        patientFirstName: true,
        patientLastName: true,
        age: true,
        gender: true,
        maritalStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: cards.map((card) => ({
          ...card,
          createdAt: card.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching patient cards:", error);
    return jsonError("เกิดข้อผิดพลาดในการดึงบัตรผู้ป่วย", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("คำขอไม่ผ่านการตรวจสอบความปลอดภัย", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError("รองรับเฉพาะข้อมูล JSON", 415);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const clerkId = requiredText(body.clerkId, "ผู้บันทึก");
    const classroomId = requiredText(body.classroomId, "ห้องเรียน");
    const groupId = requiredText(body.groupId, "ห้องตรวจ");
    const simulationId = requiredText(body.simulationId, "รอบจำลอง");
    const patientPrefix = requiredText(body.patientPrefix, "คำนำหน้าชื่อ");
    const patientFirstName = requiredText(body.patientFirstName, "ชื่อ");
    const patientLastName = requiredText(body.patientLastName, "นามสกุล");
    const gender = requiredText(body.gender, "เพศ");
    const maritalStatus = requiredText(body.maritalStatus, "สถานภาพ");
    const diseaseCode = requiredText(body.diseaseCode, "รหัสโรค");
    const age = Number(body.age);

    if (!PREFIXES.has(patientPrefix)) return jsonError("คำนำหน้าชื่อไม่ถูกต้อง", 400);
    if (!GENDERS.has(gender)) return jsonError("ข้อมูลเพศไม่ถูกต้อง", 400);
    if (!MARITAL_STATUSES.has(maritalStatus)) return jsonError("ข้อมูลสถานภาพไม่ถูกต้อง", 400);
    if (
      (typeof body.age !== "string" && typeof body.age !== "number") ||
      (typeof body.age === "string" && !body.age.trim()) ||
      !Number.isInteger(age) ||
      age < 0 ||
      age > 130
    ) {
      return jsonError("กรุณากรอกอายุให้ถูกต้อง", 400);
    }

    const [clerk, classroom, group, simulation] = await Promise.all([
      prisma.user.findFirst({
        where: { id: clerkId, role: "STUDENT", isActive: true },
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
      getRunningSimulationParticipant({
        simulationId,
        studentId: clerkId,
        classroomId,
        groupId,
        role: "card-room",
      }),
    ]);

    if (!clerk || !classroom || !group || !simulation) {
      return jsonError("ไม่พบข้อมูลผู้บันทึก ห้องเรียน หรือห้องตรวจ กรุณาเลือกใหม่", 400);
    }

    const card = await createPatientCardWithReservedQueue({
      diseaseCode,
      clerkId: clerk.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      clerkName: clerk.name,
      classroomName: classroom.name,
      groupName: group.name,
      patientPrefix,
      patientFirstName,
      patientLastName,
      age,
      gender,
      maritalStatus,
    });

    return NextResponse.json(
      {
        success: true,
        message: "ออกบัตรผู้ป่วยเรียบร้อยแล้ว",
        data: { ...card, createdAt: card.createdAt.toISOString() },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 400);
    if (isRetryableQueueError(error)) {
      return jsonError("ระบบกำลังจัดลำดับคิว กรุณาลองอีกครั้ง", 503);
    }
    if (error instanceof Error && (error.message.startsWith("กรุณา") || error.message.endsWith("ยาวเกินไป"))) {
      return jsonError(error.message, 400);
    }
    console.error("Error creating patient card:", error);
    return jsonError("เกิดข้อผิดพลาดในการออกบัตรผู้ป่วย", 500);
  }
}
