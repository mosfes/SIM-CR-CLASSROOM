import { prisma } from "@/lib/prisma";
import { parseLabResults } from "@/lib/disease-lab-results";
import { formatGroupNameForDisplay } from "@/lib/simulation-groups";

export async function getActiveClassroomsWithGroups() {
  const classrooms = await prisma.classroom.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      groups: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  return classrooms.map((classroom) => ({
    ...classroom,
    groups: classroom.groups.map((group) => ({
      ...group,
      name: formatGroupNameForDisplay(group.name),
    })),
  }));
}

export async function getStudentById(id: string) {
  if (!id) return null;
  return prisma.user.findFirst({
    where: { id, role: "STUDENT", isActive: true },
    select: { id: true, studentId: true, name: true },
  });
}

export async function getClassroomById(id: string) {
  if (!id) return null;
  const classroom = await prisma.classroom.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      groups: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!classroom) return null;

  return {
    ...classroom,
    groups: classroom.groups.map((group) => ({
      ...group,
      name: formatGroupNameForDisplay(group.name),
    })),
  };
}

export async function getGroupById(id: string, classroomId: string) {
  if (!id) return null;
  const group = await prisma.classroomGroup.findFirst({
    where: { id, classroomId, isActive: true },
    select: { id: true, name: true },
  });

  return group
    ? { ...group, name: formatGroupNameForDisplay(group.name) }
    : null;
}

export async function getDiseaseSymptomsByCodes(codes: Array<string | null | undefined>) {
  const uniqueCodes = [...new Set(codes.map((code) => code?.trim()).filter(Boolean))] as string[];
  if (uniqueCodes.length === 0) return new Map<string, string>();

  const diseases = await prisma.disease.findMany({
    where: { code: { in: uniqueCodes }, isActive: true },
    select: { code: true, symptoms: true },
  });

  return new Map(
    diseases
      .map((disease) => [disease.code, disease.symptoms.trim()] as const)
      .filter(([, symptoms]) => symptoms.length > 0),
  );
}

export async function getAvailablePatientCards(
  classroomId: string,
  groupId: string,
  simulationId: string
) {
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
      diseaseCode: true,
      createdAt: true,
    },
  });

  const symptomsByCode = await getDiseaseSymptomsByCodes(cards.map((card) => card.diseaseCode));

  return cards.map(({ diseaseCode, ...card }) => ({
    ...card,
    symptoms: symptomsByCode.get(diseaseCode?.trim() || "") || null,
    createdAt: card.createdAt.toISOString(),
  }));
}

export const nurseInterviewCaseSelect = {
  id: true,
  queueNumber: true,
  patientCardId: true,
  nurseName: true,
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
  createdAt: true,
} as const;

type NurseInterviewCaseRow = {
  weightKg: { toNumber(): number };
  heightCm: { toNumber(): number };
  createdAt: Date;
};

export function serializeNurseInterviewCase<T extends NurseInterviewCaseRow>(interview: T) {
  return {
    ...interview,
    weightKg: interview.weightKg.toNumber(),
    heightCm: interview.heightCm.toNumber(),
    createdAt: interview.createdAt.toISOString(),
  };
}

/** คิวของสถานีเทคนิคการแพทย์: ซักประวัติแล้ว แต่ยังไม่ได้ส่งผลแล็บ */
export async function getNurseInterviewsAwaitingLab(
  classroomId: string,
  groupId: string,
  simulationId: string
) {
  const interviews = await prisma.nurseInterview.findMany({
    where: {
      classroomId,
      groupId,
      simulationId,
      labResult: null,
      // เคสเก่าที่แพทย์วินิจฉัยไปแล้วก่อนมีสถานีแล็บ ไม่ต้องค้างอยู่ในคิวนี้
      doctorDiagnosis: null,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: nurseInterviewCaseSelect,
  });

  return interviews.map(serializeNurseInterviewCase);
}

/** คิวของสถานีแพทย์: ต้องมีผลแล็บจากเทคนิคการแพทย์แล้ว และยังไม่ถูกวินิจฉัย */
export async function getAvailableNurseInterviews(
  classroomId: string,
  groupId: string,
  simulationId: string
) {
  const interviews = await prisma.nurseInterview.findMany({
    where: {
      classroomId,
      groupId,
      simulationId,
      doctorDiagnosis: null,
      labResult: { isNot: null },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      ...nurseInterviewCaseSelect,
      labResult: {
        select: {
          id: true,
          medTechName: true,
          labItems: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  return interviews.map(({ labResult, ...interview }) => ({
    ...serializeNurseInterviewCase(interview),
    labResult: labResult
      ? {
          id: labResult.id,
          medTechName: labResult.medTechName,
          // ชื่อโรคของชุดตรวจถูกตัดออกโดยตั้งใจ แพทย์ต้องอ่านค่าผลตรวจเอง
          items: parseLabResults(labResult.labItems),
          notes: labResult.notes,
          createdAt: labResult.createdAt.toISOString(),
        }
      : null,
  }));
}

/**
 * ชุดตรวจทางห้องปฏิบัติการที่เทคนิคการแพทย์เลือกส่งได้
 *
 * ตั้งใจไม่ส่งชื่อ/รหัสโรคของชุดตรวจออกไปฝั่งผู้เล่น เพราะนักเรียนต้องอ่านค่าผลตรวจ
 * เทียบกับอาการจากพยาบาลเอง และสลับลำดับทุกครั้งเพื่อไม่ให้จำตำแหน่งของชุดได้
 */
export async function getLabPanels() {
  const diseases = await prisma.disease.findMany({
    where: { isActive: true },
    select: { id: true, labResults: true },
  });

  const panels = diseases
    .map((disease) => ({
      id: disease.id,
      items: parseLabResults(disease.labResults),
    }))
    .filter((panel) => panel.items.length > 0);

  for (let i = panels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [panels[i], panels[j]] = [panels[j], panels[i]];
  }

  return panels;
}

export async function getActiveDiseases() {
  const diseases = await prisma.disease.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return diseases;
}

export async function getAvailableDoctorDiagnoses(
  classroomId: string,
  groupId: string,
  simulationId: string
) {
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

  return diagnoses.map((d) => {
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
  });
}
