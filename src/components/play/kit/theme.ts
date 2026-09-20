import type { AppSelectTone } from "@/components/ui/app-select";
import type { PlayRoleId } from "@/lib/play/roles";

/**
 * สีประจำบทบาทของฝั่งนักเรียน — class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
 * ทุกสถานีใช้ชุดนี้ร่วมกัน เพื่อให้แต่ละสถานีมีสีเดียวกันทั้งตัวหัว ปุ่ม ตัวเลือก และเส้นทางผู้ป่วย
 */
export interface RoleTheme {
  /** ค่า tone ของ AppSelect */
  tone: AppSelectTone;
  /** พื้นหลังไล่สีของหัวสถานี */
  gradient: string;
  /** พื้นทึบ ตัวอักษรขาว (ป้ายรหัส ไอคอน) */
  solid: string;
  /** ป้าย/ชิปแบบอ่อน */
  soft: string;
  /** แผงข้อมูลพื้นอ่อน */
  panel: string;
  /** ตัวอักษรเน้น */
  text: string;
  /** ขอบอ่อน */
  border: string;
  /** วงแหวนโฟกัส/สถานะปัจจุบัน */
  ring: string;
  /** ช่องกรอก: hover / focus */
  field: string;
  /** การ์ดที่กดเลือกได้ (ยังไม่เลือก) */
  choice: string;
  /** การ์ดที่ถูกเลือกแล้ว */
  chosen: string;
  /** ปุ่มหลักแบบเกม (ขอบล่างหนา) */
  cta: string;
  /** แถวในรายการที่กำลังชี้/โฟกัส */
  rowActive: string;
}

export const ROLE_THEME: Record<PlayRoleId, RoleTheme> = {
  "card-room": {
    tone: "amber",
    gradient: "from-amber-600 via-orange-600 to-rose-600",
    solid: "bg-amber-500 text-white",
    soft: "border-amber-200 bg-amber-50 text-amber-800",
    panel: "border-amber-200 bg-amber-50/60",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-200",
    field: "hover:border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100",
    choice: "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40",
    chosen: "border-amber-500 bg-amber-50 ring-2 ring-amber-100",
    cta: "border-amber-800 bg-amber-500 shadow-amber-500/25 hover:bg-amber-600",
    rowActive: "bg-amber-50",
  },
  nurse: {
    tone: "emerald",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    solid: "bg-emerald-500 text-white",
    soft: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50/60",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "ring-emerald-200",
    field: "hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100",
    choice: "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40",
    chosen: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100",
    cta: "border-emerald-800 bg-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700",
    rowActive: "bg-emerald-50",
  },
  medtech: {
    tone: "indigo",
    gradient: "from-indigo-600 via-violet-600 to-purple-600",
    solid: "bg-indigo-500 text-white",
    soft: "border-indigo-200 bg-indigo-50 text-indigo-800",
    panel: "border-indigo-200 bg-indigo-50/60",
    text: "text-indigo-700",
    border: "border-indigo-200",
    ring: "ring-indigo-200",
    field: "hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
    choice: "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40",
    chosen: "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100",
    cta: "border-indigo-800 bg-indigo-600 shadow-indigo-500/25 hover:bg-indigo-700",
    rowActive: "bg-indigo-50",
  },
  doctor: {
    tone: "sky",
    gradient: "from-sky-600 via-blue-600 to-indigo-600",
    solid: "bg-sky-500 text-white",
    soft: "border-sky-200 bg-sky-50 text-sky-800",
    panel: "border-sky-200 bg-sky-50/60",
    text: "text-sky-700",
    border: "border-sky-200",
    ring: "ring-sky-200",
    field: "hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100",
    choice: "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40",
    chosen: "border-sky-500 bg-sky-50 ring-2 ring-sky-100",
    cta: "border-sky-800 bg-sky-500 shadow-sky-500/25 hover:bg-sky-600",
    rowActive: "bg-sky-50",
  },
  pharmacist: {
    tone: "fuchsia",
    gradient: "from-fuchsia-600 via-purple-600 to-indigo-600",
    solid: "bg-fuchsia-500 text-white",
    soft: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
    panel: "border-fuchsia-200 bg-fuchsia-50/60",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    ring: "ring-fuchsia-200",
    field: "hover:border-fuchsia-300 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100",
    choice: "border-slate-200 bg-white hover:border-fuchsia-300 hover:bg-fuchsia-50/40",
    chosen: "border-fuchsia-500 bg-fuchsia-50 ring-2 ring-fuchsia-100",
    cta: "border-fuchsia-800 bg-fuchsia-600 shadow-fuchsia-600/25 hover:bg-fuchsia-700",
    rowActive: "bg-fuchsia-50",
  },
};

/** ช่องกรอกข้อความ/ตัวเลขมาตรฐาน — สูง 48px และใช้ตัวอักษร 16px กันเบราว์เซอร์มือถือซูมเอง */
export function inputClass(roleId: PlayRoleId) {
  return `mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 ${ROLE_THEME[roleId].field}`;
}

export function textareaClass(roleId: PlayRoleId) {
  return `mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-300 ${ROLE_THEME[roleId].field}`;
}

/** คอลัมน์ซ้ายที่ค้างอยู่บนจอใหญ่ (อ่านข้อมูลผู้ป่วยไปพร้อมกับกรอกคำตอบทางขวา) ถ้าสูงเกินจอจะเลื่อนภายใน */
export const STICKY_COLUMN =
  "space-y-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-11.5rem)] lg:overflow-y-auto lg:pr-1 pb-6";
