import {
  FlaskConical,
  HeartPulse,
  IdCard,
  Pill,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { NURSE_MAX_SCORE } from "@/lib/nurse-choices";

export interface MedicineItem {
  name: string;
  tabletCount: number;
}

export interface ClassroomOption {
  id: string;
  name: string;
  groups: Array<{ id: string; name: string }>;
}

export type SubmissionStage =
  | "WAITING_NURSE"
  | "WAITING_LAB"
  | "WAITING_DOCTOR"
  | "WAITING_PHARMACY"
  | "COMPLETED";

export type DiagnosisEvaluation = "PENDING" | "CORRECT" | "INCORRECT" | "NO_KEY";

export interface SubmissionItem {
  id: string;
  queueNumber: number | null;
  stage: SubmissionStage;
  stageLabel: string;
  diagnosisEvaluation: DiagnosisEvaluation;
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    gender: string;
    maritalStatus: string;
  };
  group: {
    id: string;
    name: string;
  };
  classroom: {
    id: string;
    name: string;
  };
  cardRoom: {
    clerkName: string;
    diseaseCode: string | null;
    createdAt: string;
  };
  nurse: {
    id: string;
    nurseName: string;
    weightKg: number;
    heightCm: number;
    systolicBp: number;
    diastolicBp: number;
    pulseBpm: number;
    chronicDiseaseStatus: string;
    chronicDiseaseDetails: string | null;
    chiefComplaint: string | null;
    symptomDescription: string;
    notes: string | null;
    endocrineGlandChoice: string | null;
    abnormalHormoneChoice: string | null;
    isGlandCorrect: boolean | null;
    isHormoneCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  lab: {
    id: string;
    medTechName: string;
    panelDiseaseCode: string | null;
    panelDiseaseName: string;
    items: Array<{ name: string; result: string; referenceRange: string }>;
    isCorrect: boolean | null;
    evaluationScore?: number | null;
    notes: string | null;
    createdAt: string;
  } | null;
  doctor: {
    id: string;
    doctorName: string;
    diseaseId: string | null;
    diseaseCode: string;
    diseaseName: string;
    doctorDiagnosis: string;
    treatmentPlan: string | null;
    notes: string | null;
    isCorrect?: boolean | null;
    evaluationScore?: number | null;
    aiModel?: string | null;
    aiFeedback?: string | null;
    aiStrengths?: string | null;
    aiEvaluatedAt?: string | null;
    createdAt: string;
  } | null;
  pharmacy: {
    id: string;
    pharmacistName: string;
    medicines: unknown;
    totalTablets: number | null;
    hormoneChoiceKey: string | null;
    hormoneChoiceLabel: string | null;
    treatmentChoiceKey: string | null;
    treatmentChoiceLabel: string | null;
    isHormoneCorrect: boolean | null;
    isTreatmentCorrect: boolean | null;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
}

export interface SubmissionListItem {
  id: string;
  queueNumber: number | null;
  stage: SubmissionStage;
  stageLabel: string;
  diagnosisEvaluation: DiagnosisEvaluation;
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    gender: string;
    maritalStatus: string;
  };
  group: { id: string; name: string };
  classroom: { id: string; name: string };
  cardRoom: { clerkName: string; diseaseCode: string | null; createdAt: string };
  nurse: {
    id: string;
    nurseName: string;
    systolicBp: number;
    diastolicBp: number;
    pulseBpm: number;
    chiefComplaint: string | null;
    symptomDescription: string;
    endocrineGlandChoice: string | null;
    abnormalHormoneChoice: string | null;
    isGlandCorrect: boolean | null;
    isHormoneCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  lab: {
    id: string;
    medTechName: string;
    panelDiseaseName: string;
    itemCount: number;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  doctor: {
    id: string;
    doctorName: string;
    diseaseCode: string | null;
    diseaseName: string;
    doctorDiagnosis: string;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    aiModel: string | null;
    createdAt: string;
  } | null;
  pharmacy: {
    id: string;
    pharmacistName: string;
    totalTablets: number | null;
    hormoneChoiceKey: string | null;
    treatmentChoiceKey: string | null;
    isHormoneCorrect: boolean | null;
    isTreatmentCorrect: boolean | null;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
}

export interface Metrics {
  totalCases: number;
  waitingNurseCount: number;
  waitingLabCount: number;
  waitingDoctorCount: number;
  waitingPharmacyCount: number;
  completedCount: number;
  diagnosedCount: number;
  correctDiagnosesCount: number;
  accuracyRate: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DOCTOR_MAX_SCORE = 10;
const MED_TECH_MAX_SCORE = 2;
const PHARMACIST_MAX_SCORE = 3;

export const SCORE_MAXIMUMS = {
  total: NURSE_MAX_SCORE + DOCTOR_MAX_SCORE + MED_TECH_MAX_SCORE + PHARMACIST_MAX_SCORE,
  nurse: NURSE_MAX_SCORE,
  doctor: DOCTOR_MAX_SCORE,
  medTech: MED_TECH_MAX_SCORE,
  pharmacist: PHARMACIST_MAX_SCORE,
} as const;

export function formatScore(score: number | null | undefined, maximum: number) {
  return `${typeof score === "number" ? score : "—"}/${maximum}`;
}

export function formatTime(isoString: string | null | undefined) {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}

export function formatDateTime(isoString: string | null | undefined) {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

// class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
export type Tone = "amber" | "emerald" | "indigo" | "sky" | "fuchsia" | "slate";

export interface ToneClasses {
  /** ตัวอักษรเข้ม */
  text: string;
  /** พื้นอ่อน + ขอบอ่อน สำหรับชิป/แผง */
  soft: string;
  /** พื้นทึบ + ตัวอักษรขาว */
  solid: string;
  /** ขอบเข้มสำหรับสถานะ "กำลังรอ" */
  border: string;
  /** สีเส้นเชื่อมและแถบสัดส่วน */
  bar: string;
}

export const TONES: Record<Tone, ToneClasses> = {
  amber: {
    text: "text-amber-700",
    soft: "border-amber-200 bg-amber-50 text-amber-800",
    solid: "bg-amber-500 text-white",
    border: "border-amber-400",
    bar: "bg-amber-400",
  },
  emerald: {
    text: "text-emerald-700",
    soft: "border-emerald-200 bg-emerald-50 text-emerald-800",
    solid: "bg-emerald-500 text-white",
    border: "border-emerald-400",
    bar: "bg-emerald-400",
  },
  indigo: {
    text: "text-indigo-700",
    soft: "border-indigo-200 bg-indigo-50 text-indigo-800",
    solid: "bg-indigo-500 text-white",
    border: "border-indigo-400",
    bar: "bg-indigo-400",
  },
  sky: {
    text: "text-sky-700",
    soft: "border-sky-200 bg-sky-50 text-sky-800",
    solid: "bg-sky-500 text-white",
    border: "border-sky-400",
    bar: "bg-sky-400",
  },
  fuchsia: {
    text: "text-fuchsia-700",
    soft: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
    solid: "bg-fuchsia-500 text-white",
    border: "border-fuchsia-400",
    bar: "bg-fuchsia-400",
  },
  slate: {
    text: "text-slate-700",
    soft: "border-slate-200 bg-slate-100 text-slate-700",
    solid: "bg-slate-700 text-white",
    border: "border-slate-400",
    bar: "bg-slate-500",
  },
};

export type StationKey = "card" | "nurse" | "lab" | "doctor" | "pharmacy";

export interface StationMeta {
  key: StationKey;
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/** ลำดับสถานีที่ผู้ป่วยเดินทาง */
export const STATIONS: readonly StationMeta[] = [
  { key: "card", label: "ห้องบัตร", icon: IdCard, tone: "amber" },
  { key: "nurse", label: "พยาบาล", icon: HeartPulse, tone: "emerald" },
  { key: "lab", label: "เทคนิคการแพทย์", icon: FlaskConical, tone: "indigo" },
  { key: "doctor", label: "แพทย์", icon: Stethoscope, tone: "sky" },
  { key: "pharmacy", label: "ห้องยา", icon: Pill, tone: "fuchsia" },
];

/** สถานีที่ผู้ป่วยกำลังรออยู่ ตามสถานะของคิว */
export const STAGE_CURRENT_STATION: Record<SubmissionStage, StationKey | null> = {
  WAITING_NURSE: "nurse",
  WAITING_LAB: "lab",
  WAITING_DOCTOR: "doctor",
  WAITING_PHARMACY: "pharmacy",
  COMPLETED: null,
};

export const STAGE_TONE: Record<SubmissionStage, Tone> = {
  WAITING_NURSE: "emerald",
  WAITING_LAB: "indigo",
  WAITING_DOCTOR: "sky",
  WAITING_PHARMACY: "fuchsia",
  COMPLETED: "slate",
};

/**
 * สีตามคะแนน: ถ้ารู้ผลถูก/ผิดจริงให้ยึดผลนั้นก่อน (เช่น แพทย์วินิจฉัยถูกแต่ได้ 9/10 ก็ยังเป็นสีเขียว)
 * ไม่รู้ผล = ดูสัดส่วนคะแนน: เต็ม = เขียว, 0 = แดง, ระหว่างกลาง = เหลือง, ไม่มีคะแนน = เทา
 */
export function scoreClasses(
  score: number | null | undefined,
  maximum: number,
  correct?: boolean | null
) {
  if (typeof score !== "number") return "border-slate-200 bg-slate-100 text-slate-500";
  if (correct === true) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (correct === false) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= maximum) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score <= 0) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
