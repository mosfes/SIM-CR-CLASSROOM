import { IdCard, HeartPulse, FlaskConical, Stethoscope, Pill, type LucideIcon } from "lucide-react";

export type PlayRoleId = "card-room" | "nurse" | "medtech" | "doctor" | "pharmacist";

export interface PlayRole {
  id: PlayRoleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  needsGroup: boolean;
  gradient: string;
  ring: string;
  chip: string;
}

export const PLAY_ROLES: PlayRole[] = [
  {
    id: "card-room",
    label: "ห้องบัตร",
    shortLabel: "บัตร",
    description: "ออกบัตรผู้ป่วย กำหนดรหัสผู้ป่วย แล้วส่งต่อไปยังห้องตรวจ",
    icon: IdCard,
    needsGroup: true,
    gradient: "from-amber-400 to-orange-500",
    ring: "ring-amber-300",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "nurse",
    label: "พยาบาล",
    shortLabel: "พยาบาล",
    description: "ซักประวัติ วัดสัญญาณชีพ และเตรียมผู้ป่วยก่อนพบแพทย์",
    icon: HeartPulse,
    needsGroup: true,
    gradient: "from-emerald-400 to-teal-500",
    ring: "ring-emerald-300",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "medtech",
    label: "เทคนิคการแพทย์",
    shortLabel: "แล็บ",
    description: "เลือกชุดผลตรวจทางห้องปฏิบัติการจากข้อมูลพยาบาล แล้วส่งต่อให้แพทย์",
    icon: FlaskConical,
    needsGroup: true,
    gradient: "from-indigo-400 to-violet-500",
    ring: "ring-indigo-300",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "doctor",
    label: "แพทย์",
    shortLabel: "แพทย์",
    description: "วินิจฉัยอาการจากประวัติและผลแล็บ แล้ววางแผนการรักษาผู้ป่วย",
    icon: Stethoscope,
    needsGroup: true,
    gradient: "from-sky-400 to-blue-500",
    ring: "ring-sky-300",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "pharmacist",
    label: "เภสัชกร",
    shortLabel: "เภสัช",
    description: "จ่ายยาตามใบสั่งแพทย์และให้คำแนะนำการใช้ยา",
    icon: Pill,
    needsGroup: true,
    gradient: "from-fuchsia-400 to-purple-500",
    ring: "ring-fuchsia-300",
    chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  },
];

export function getPlayRole(id: string | undefined | null): PlayRole | undefined {
  return PLAY_ROLES.find((role) => role.id === id);
}
