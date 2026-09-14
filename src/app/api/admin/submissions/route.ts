import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { parseLabResults } from "@/lib/disease-lab-results";
import { formatGroupNameForDisplay } from "@/lib/simulation-groups";

type SubmissionStage =
  | "WAITING_NURSE"
  | "WAITING_LAB"
  | "WAITING_DOCTOR"
  | "WAITING_PHARMACY"
  | "COMPLETED";
type DiagnosisEvaluation = "PENDING" | "CORRECT" | "INCORRECT" | "NO_KEY";

const STAGES = new Set<SubmissionStage>([
  "WAITING_NURSE",
  "WAITING_LAB",
  "WAITING_DOCTOR",
  "WAITING_PHARMACY",
  "COMPLETED",
]);
const EVALUATIONS = new Set<DiagnosisEvaluation>([
  "PENDING",
  "CORRECT",
  "INCORRECT",
  "NO_KEY",
]);

function getStage(card: {
  nurseInterview: unknown | null;
  labResult: unknown | null;
  doctorDiagnosis: unknown | null;
  pharmacyDispense: unknown | null;
}) {
  if (card.pharmacyDispense) {
    return { stage: "COMPLETED" as const, stageLabel: "จ่ายยาเสร็จสิ้น" };
  }
  if (card.doctorDiagnosis) {
    return { stage: "WAITING_PHARMACY" as const, stageLabel: "รอจ่ายยา" };
  }
  if (card.labResult) {
    return { stage: "WAITING_DOCTOR" as const, stageLabel: "รอตรวจวินิจฉัย" };
  }
  if (card.nurseInterview) {
    return { stage: "WAITING_LAB" as const, stageLabel: "รอผลแล็บ" };
  }
  return { stage: "WAITING_NURSE" as const, stageLabel: "รอซักประวัติ" };
}

function getDiagnosisEvaluation(card: {
  diseaseCode: string | null;
  doctorDiagnosis: { diseaseCode: string | null } | null;
}): DiagnosisEvaluation {
  if (!card.doctorDiagnosis) return "PENDING";
  if (!card.diseaseCode?.trim()) return "NO_KEY";

  const expected = card.diseaseCode.trim().toLowerCase();
  const actual = card.doctorDiagnosis.diseaseCode?.trim().toLowerCase() || "";
  return expected === actual ? "CORRECT" : "INCORRECT";
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type MetricsRow = Record<
  | "totalCases"
  | "waitingNurseCount"
  | "waitingLabCount"
  | "waitingDoctorCount"
  | "waitingPharmacyCount"
  | "completedCount"
  | "diagnosedCount"
  | "correctDiagnosesCount",
  bigint | number
>;

function toNumber(value: bigint | number | undefined) {
  return typeof value === "bigint" ? Number(value) : value || 0;
}

// The list itself is paginated, while this single aggregate query provides
// the unfiltered classroom/group summary without loading every patient row.
async function getMetrics(classroomId: string, groupId: string) {
  const scope = groupId && groupId !== "ALL"
    ? Prisma.sql`pc.\`classroomId\` = ${classroomId} AND pc.\`groupId\` = ${groupId}`
    : Prisma.sql`pc.\`classroomId\` = ${classroomId}`;
  const [row] = await prisma.$queryRaw<MetricsRow[]>(Prisma.sql`
    SELECT
      COUNT(*) AS totalCases,
      COALESCE(SUM(CASE WHEN ni.id IS NULL AND lr.id IS NULL AND dd.id IS NULL AND pd.id IS NULL THEN 1 ELSE 0 END), 0) AS waitingNurseCount,
      COALESCE(SUM(CASE WHEN ni.id IS NOT NULL AND lr.id IS NULL AND dd.id IS NULL AND pd.id IS NULL THEN 1 ELSE 0 END), 0) AS waitingLabCount,
      COALESCE(SUM(CASE WHEN lr.id IS NOT NULL AND dd.id IS NULL AND pd.id IS NULL THEN 1 ELSE 0 END), 0) AS waitingDoctorCount,
      COALESCE(SUM(CASE WHEN dd.id IS NOT NULL AND pd.id IS NULL THEN 1 ELSE 0 END), 0) AS waitingPharmacyCount,
      COALESCE(SUM(CASE WHEN pd.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS completedCount,
      COALESCE(SUM(CASE WHEN dd.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS diagnosedCount,
      COALESCE(SUM(CASE WHEN dd.\`isCorrect\` = 1 THEN 1 ELSE 0 END), 0) AS correctDiagnosesCount
    FROM \`PatientCard\` AS pc
    LEFT JOIN \`NurseInterview\` AS ni ON ni.\`patientCardId\` = pc.id
    LEFT JOIN \`LabResult\` AS lr ON lr.\`patientCardId\` = pc.id
    LEFT JOIN \`DoctorDiagnosis\` AS dd ON dd.\`patientCardId\` = pc.id
    LEFT JOIN \`PharmacyDispense\` AS pd ON pd.\`patientCardId\` = pc.id
    WHERE ${scope}
  `);

  return {
    totalCases: toNumber(row?.totalCases),
    waitingNurseCount: toNumber(row?.waitingNurseCount),
    waitingLabCount: toNumber(row?.waitingLabCount),
    waitingDoctorCount: toNumber(row?.waitingDoctorCount),
    waitingPharmacyCount: toNumber(row?.waitingPharmacyCount),
    completedCount: toNumber(row?.completedCount),
    diagnosedCount: toNumber(row?.diagnosedCount),
    correctDiagnosesCount: toNumber(row?.correctDiagnosesCount),
  };
}

async function getSubmissionDetail(id: string) {
  const card = await prisma.patientCard.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      nurseInterview: true,
      labResult: true,
      doctorDiagnosis: true,
      pharmacyDispense: true,
    },
  });

  if (!card) return null;

  const { stage, stageLabel } = getStage(card);
  const diagnosisEvaluation = getDiagnosisEvaluation(card);

  return {
    id: card.id,
    queueNumber: card.queueNumber,
    stage,
    stageLabel,
    diagnosisEvaluation,
    patient: {
      prefix: card.patientPrefix,
      firstName: card.patientFirstName,
      lastName: card.patientLastName,
      fullName: `${card.patientPrefix}${card.patientFirstName} ${card.patientLastName}`,
      age: card.age,
      gender: card.gender,
      maritalStatus: card.maritalStatus,
    },
    group: {
      id: card.group?.id || card.groupId || "",
      name: formatGroupNameForDisplay(card.group?.name || card.groupName || "ห้องตรวจไม่ระบุ"),
    },
    classroom: { id: card.classroomId || "", name: card.classroomName },
    cardRoom: {
      clerkName: card.clerkName,
      diseaseCode: card.diseaseCode,
      createdAt: card.createdAt.toISOString(),
    },
    nurse: card.nurseInterview
      ? {
          id: card.nurseInterview.id,
          nurseName: card.nurseInterview.nurseName,
          weightKg: card.nurseInterview.weightKg.toNumber(),
          heightCm: card.nurseInterview.heightCm.toNumber(),
          systolicBp: card.nurseInterview.systolicBp,
          diastolicBp: card.nurseInterview.diastolicBp,
          pulseBpm: card.nurseInterview.pulseBpm,
          chronicDiseaseStatus: card.nurseInterview.chronicDiseaseStatus,
          chronicDiseaseDetails: card.nurseInterview.chronicDiseaseDetails,
          chiefComplaint: card.nurseInterview.chiefComplaint,
          symptomDescription: card.nurseInterview.symptomDescription,
          notes: card.nurseInterview.notes,
          createdAt: card.nurseInterview.createdAt.toISOString(),
        }
      : null,
    lab: card.labResult
      ? {
          id: card.labResult.id,
          medTechName: card.labResult.medTechName,
          panelDiseaseCode: card.labResult.panelDiseaseCode,
          panelDiseaseName: card.labResult.panelDiseaseName,
          items: parseLabResults(card.labResult.labItems),
          isCorrect: card.labResult.isCorrect,
          evaluationScore: card.labResult.evaluationScore,
          notes: card.labResult.notes,
          createdAt: card.labResult.createdAt.toISOString(),
        }
      : null,
    doctor: card.doctorDiagnosis
      ? {
          id: card.doctorDiagnosis.id,
          doctorName: card.doctorDiagnosis.doctorName,
          diseaseId: card.doctorDiagnosis.diseaseId,
          diseaseCode: card.doctorDiagnosis.diseaseCode,
          diseaseName: card.doctorDiagnosis.diseaseName,
          doctorDiagnosis: card.doctorDiagnosis.doctorDiagnosis,
          treatmentPlan: card.doctorDiagnosis.treatmentPlan,
          notes: card.doctorDiagnosis.notes,
          isCorrect: card.doctorDiagnosis.isCorrect,
          evaluationScore: card.doctorDiagnosis.evaluationScore,
          aiModel: card.doctorDiagnosis.aiModel,
          aiFeedback: card.doctorDiagnosis.aiFeedback,
          aiStrengths: card.doctorDiagnosis.aiStrengths,
          aiEvaluatedAt: card.doctorDiagnosis.aiEvaluatedAt?.toISOString() ?? null,
          createdAt: card.doctorDiagnosis.createdAt.toISOString(),
        }
      : null,
    pharmacy: card.pharmacyDispense
      ? {
          id: card.pharmacyDispense.id,
          pharmacistName: card.pharmacyDispense.pharmacistName,
          medicines: card.pharmacyDispense.medicines,
          totalTablets: card.pharmacyDispense.totalTablets,
          createdAt: card.pharmacyDispense.createdAt.toISOString(),
        }
      : null,
  };
}

function getStageWhere(stage: SubmissionStage): Prisma.PatientCardWhereInput {
  if (stage === "COMPLETED") return { pharmacyDispense: { isNot: null } };
  if (stage === "WAITING_PHARMACY") {
    return { pharmacyDispense: null, doctorDiagnosis: { isNot: null } };
  }
  if (stage === "WAITING_DOCTOR") {
    return { pharmacyDispense: null, doctorDiagnosis: null, labResult: { isNot: null } };
  }
  if (stage === "WAITING_LAB") {
    return {
      pharmacyDispense: null,
      doctorDiagnosis: null,
      labResult: null,
      nurseInterview: { isNot: null },
    };
  }
  return {
    pharmacyDispense: null,
    doctorDiagnosis: null,
    labResult: null,
    nurseInterview: null,
  };
}

function getEvaluationWhere(evaluation: DiagnosisEvaluation): Prisma.PatientCardWhereInput {
  if (evaluation === "PENDING") return { doctorDiagnosis: null };
  if (evaluation === "CORRECT") {
    return { doctorDiagnosis: { is: { isCorrect: true } } };
  }
  if (evaluation === "INCORRECT") {
    return { doctorDiagnosis: { is: { isCorrect: false } } };
  }
  return {
    doctorDiagnosis: { isNot: null },
    OR: [{ diseaseCode: null }, { diseaseCode: "" }],
  };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("id")?.trim() || "";

    if (submissionId) {
      const submission = await getSubmissionDetail(submissionId);
      if (!submission) {
        return NextResponse.json(
          { success: false, error: "ไม่พบข้อมูลการส่งตรวจนี้" },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { success: true, data: submission },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const classroomId = searchParams.get("classroomId")?.trim() || "";
    const groupId = searchParams.get("groupId")?.trim() || "";
    const search = searchParams.get("q")?.trim().slice(0, 120) || "";
    const requestedStage = searchParams.get("stage") || "ALL";
    const requestedEvaluation = searchParams.get("evaluation") || "ALL";
    const pageSizeInput = parsePositiveInteger(searchParams.get("pageSize"), 10);
    const pageSize = [10, 20, 50].includes(pageSizeInput) ? pageSizeInput : 10;
    const requestedPage = parsePositiveInteger(searchParams.get("page"), 1);
    const includeClassrooms = searchParams.get("includeClassrooms") === "1" || !classroomId;

    const classrooms = includeClassrooms
      ? await prisma.classroom.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            groups: {
              where: { isActive: true },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            },
          },
        })
      : [];
    const displayClassrooms = classrooms.map((classroom) => ({
      ...classroom,
      groups: classroom.groups.map((group) => ({
        ...group,
        name: formatGroupNameForDisplay(group.name),
      })),
    }));

    const targetClassroomId = classroomId || classrooms[0]?.id || "";
    if (!targetClassroomId) {
      return NextResponse.json(
        {
          success: true,
          data: {
            classrooms: displayClassrooms,
            selectedClassroomId: "",
            selectedGroupId: groupId || "ALL",
            groupCounts: {},
            metrics: {
              totalCases: 0,
              waitingNurseCount: 0,
              waitingLabCount: 0,
              waitingDoctorCount: 0,
              waitingPharmacyCount: 0,
              completedCount: 0,
              diagnosedCount: 0,
              correctDiagnosesCount: 0,
              accuracyRate: 0,
            },
            pagination: { page: 1, pageSize, total: 0, totalPages: 1 },
            submissions: [],
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const baseWhere: Prisma.PatientCardWhereInput = {
      classroomId: targetClassroomId,
      ...(groupId && groupId !== "ALL" ? { groupId } : {}),
    };
    const filters: Prisma.PatientCardWhereInput[] = [baseWhere];

    if (STAGES.has(requestedStage as SubmissionStage)) {
      filters.push(getStageWhere(requestedStage as SubmissionStage));
    }
    if (EVALUATIONS.has(requestedEvaluation as DiagnosisEvaluation)) {
      filters.push(getEvaluationWhere(requestedEvaluation as DiagnosisEvaluation));
    }
    if (search) {
      const searchConditions: Prisma.PatientCardWhereInput[] = [
        { patientPrefix: { contains: search } },
        { patientFirstName: { contains: search } },
        { patientLastName: { contains: search } },
        { groupName: { contains: search } },
        { diseaseCode: { contains: search } },
        { nurseInterview: { is: { chiefComplaint: { contains: search } } } },
        { doctorDiagnosis: { is: { diseaseCode: { contains: search } } } },
        { doctorDiagnosis: { is: { diseaseName: { contains: search } } } },
        { doctorDiagnosis: { is: { doctorDiagnosis: { contains: search } } } },
      ];
      if (/^\d+$/.test(search)) {
        searchConditions.push({ queueNumber: Number.parseInt(search, 10) });
      }
      filters.push({ OR: searchConditions });
    }

    const where: Prisma.PatientCardWhereInput = filters.length === 1 ? baseWhere : { AND: filters };

    const [total, metricCounts, groupedCases] = await Promise.all([
      prisma.patientCard.count({ where }),
      getMetrics(targetClassroomId, groupId),
      prisma.patientCard.groupBy({
        by: ["groupId"],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const cards = await prisma.patientCard.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ groupId: "asc" }, { queueNumber: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        queueNumber: true,
        patientPrefix: true,
        patientFirstName: true,
        patientLastName: true,
        age: true,
        gender: true,
        maritalStatus: true,
        groupId: true,
        groupName: true,
        classroomId: true,
        classroomName: true,
        clerkName: true,
        diseaseCode: true,
        createdAt: true,
        nurseInterview: {
          select: {
            id: true,
            nurseName: true,
            systolicBp: true,
            diastolicBp: true,
            pulseBpm: true,
            chiefComplaint: true,
            symptomDescription: true,
            createdAt: true,
          },
        },
        labResult: {
          select: {
            id: true,
            medTechName: true,
            panelDiseaseName: true,
            labItems: true,
            isCorrect: true,
            evaluationScore: true,
            createdAt: true,
          },
        },
        doctorDiagnosis: {
          select: {
            id: true,
            doctorName: true,
            diseaseCode: true,
            diseaseName: true,
            doctorDiagnosis: true,
            isCorrect: true,
            evaluationScore: true,
            aiModel: true,
            createdAt: true,
          },
        },
        pharmacyDispense: {
          select: {
            id: true,
            pharmacistName: true,
            totalTablets: true,
            createdAt: true,
          },
        },
      },
    });

    const submissions = cards.map((card) => {
      const { stage, stageLabel } = getStage(card);
      return {
        id: card.id,
        queueNumber: card.queueNumber,
        stage,
        stageLabel,
        diagnosisEvaluation: getDiagnosisEvaluation(card),
        patient: {
          prefix: card.patientPrefix,
          firstName: card.patientFirstName,
          lastName: card.patientLastName,
          fullName: `${card.patientPrefix}${card.patientFirstName} ${card.patientLastName}`,
          age: card.age,
          gender: card.gender,
          maritalStatus: card.maritalStatus,
        },
        group: {
          id: card.groupId || "",
          name: formatGroupNameForDisplay(card.groupName || "ห้องตรวจไม่ระบุ"),
        },
        classroom: { id: card.classroomId || "", name: card.classroomName },
        cardRoom: {
          clerkName: card.clerkName,
          diseaseCode: card.diseaseCode,
          createdAt: card.createdAt.toISOString(),
        },
        nurse: card.nurseInterview
          ? {
              id: card.nurseInterview.id,
              nurseName: card.nurseInterview.nurseName,
              systolicBp: card.nurseInterview.systolicBp,
              diastolicBp: card.nurseInterview.diastolicBp,
              pulseBpm: card.nurseInterview.pulseBpm,
              chiefComplaint: card.nurseInterview.chiefComplaint,
              symptomDescription: card.nurseInterview.symptomDescription,
              createdAt: card.nurseInterview.createdAt.toISOString(),
            }
          : null,
        lab: card.labResult
          ? {
              id: card.labResult.id,
              medTechName: card.labResult.medTechName,
              panelDiseaseName: card.labResult.panelDiseaseName,
              itemCount: parseLabResults(card.labResult.labItems).length,
              isCorrect: card.labResult.isCorrect,
              evaluationScore: card.labResult.evaluationScore,
              createdAt: card.labResult.createdAt.toISOString(),
            }
          : null,
        doctor: card.doctorDiagnosis
          ? {
              id: card.doctorDiagnosis.id,
              doctorName: card.doctorDiagnosis.doctorName,
              diseaseCode: card.doctorDiagnosis.diseaseCode,
              diseaseName: card.doctorDiagnosis.diseaseName,
              doctorDiagnosis: card.doctorDiagnosis.doctorDiagnosis,
              isCorrect: card.doctorDiagnosis.isCorrect,
              evaluationScore: card.doctorDiagnosis.evaluationScore,
              aiModel: card.doctorDiagnosis.aiModel,
              createdAt: card.doctorDiagnosis.createdAt.toISOString(),
            }
          : null,
        pharmacy: card.pharmacyDispense
          ? {
              id: card.pharmacyDispense.id,
              pharmacistName: card.pharmacyDispense.pharmacistName,
              totalTablets: card.pharmacyDispense.totalTablets,
              createdAt: card.pharmacyDispense.createdAt.toISOString(),
            }
          : null,
      };
    });

    const groupCounts = Object.fromEntries(
      groupedCases
        .filter((item) => item.groupId)
        .map((item) => [item.groupId as string, item._count._all])
    );
    const accuracyRate =
      metricCounts.diagnosedCount > 0
        ? Math.round((metricCounts.correctDiagnosesCount / metricCounts.diagnosedCount) * 100)
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          classrooms: displayClassrooms,
          selectedClassroomId: targetClassroomId,
          selectedGroupId: groupId || "ALL",
          groupCounts,
          metrics: {
            ...metricCounts,
            accuracyRate,
          },
          pagination: { page, pageSize, total, totalPages },
          submissions,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลการส่งตรวจ" },
      { status: 500 }
    );
  }
}
