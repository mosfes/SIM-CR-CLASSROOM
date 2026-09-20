"use client";

import type { ReactNode } from "react";
import { Check, Inbox, Microscope, RefreshCw, type LucideIcon } from "lucide-react";
import type { PlayRoleId } from "@/lib/play/roles";
import { playSelect } from "@/lib/play/sound";
import { formatPatientCode } from "@/lib/patient-code";
import { ROLE_THEME } from "./theme";

export interface QueueItem {
  id: string;
  queueNumber?: number | null;
  name: string;
  /** บรรทัดรองใต้ชื่อ เช่น "30 ปี · ชาย · โสด" */
  meta: string;
}

/** รายการผู้ป่วยที่รอสถานีนี้ — กดการ์ดเพื่อเลือก (อ่านง่ายกว่า dropdown บนมือถือ) */
export function QueuePicker({
  roleId,
  label,
  items,
  selectedId,
  onSelect,
  onRefresh,
  refreshing,
  emptyText,
}: {
  roleId: PlayRoleId;
  label: string;
  items: QueueItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  emptyText: string;
}) {
  const theme = ROLE_THEME[roleId];

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
          {label}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-black tabular-nums ${theme.soft}`}>
            {items.length}
          </span>
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-bold transition hover:bg-slate-50 disabled:opacity-60 ${theme.border} ${theme.text}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-center">
          <Inbox className="h-7 w-7 text-slate-300" />
          <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-500">{emptyText}</p>
        </div>
      ) : (
        <div role="radiogroup" aria-label={label} className="grid max-h-80 gap-2 overflow-y-auto pr-0.5">
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  playSelect();
                  onSelect(item.id);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition active:scale-[0.99] ${
                  selected ? theme.chosen : theme.choice
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${theme.solid}`}
                >
                  <span className="text-[8px] font-bold leading-none opacity-80">รหัส</span>
                  <span className="text-base font-black leading-tight tabular-nums">
                    {formatPatientCode(item.queueNumber)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{item.name}</span>
                  <span className="block truncate text-xs font-medium text-slate-500">{item.meta}</span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? `border-transparent ${theme.solid}` : "border-slate-300 bg-white"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** บัตรระบุผู้ป่วยที่เลือกอยู่: รหัสตัวใหญ่ ชื่อ และข้อมูลทั่วไป */
export function PatientIdentity({
  roleId,
  queueNumber,
  name,
  age,
  gender,
  maritalStatus,
}: {
  roleId: PlayRoleId;
  queueNumber?: number | null;
  name: string;
  age: number;
  gender: string;
  maritalStatus: string;
}) {
  const theme = ROLE_THEME[roleId];
  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border p-3 sm:p-4 ${theme.panel}`}>
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl shadow-xs ${theme.solid}`}>
        <span className="text-[10px] font-bold leading-none opacity-80">รหัส</span>
        <span className="mt-0.5 text-xl font-black leading-none tabular-nums">{formatPatientCode(queueNumber)}</span>
      </div>
      <div className="min-w-0">
        <p className="break-words text-base font-black leading-snug text-slate-900 sm:text-lg">{name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold text-slate-600">
          {[`อายุ ${age} ปี`, `เพศ ${gender}`, maritalStatus].map((chip) => (
            <span key={chip} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** กล่องข้อมูลที่ส่งต่อมาจากสถานีก่อนหน้า มีหัวเรื่องบอกว่ามาจากใคร */
export function InfoBlock({
  station,
  icon: Icon,
  title,
  by,
  children,
}: {
  /** สถานีต้นทางของข้อมูล ใช้กำหนดสีหัวกล่อง */
  station: PlayRoleId;
  icon: LucideIcon;
  title: string;
  by?: string;
  children: ReactNode;
}) {
  const theme = ROLE_THEME[station];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b px-3.5 py-2.5 ${theme.panel}`}>
        <span className={`flex items-center gap-2 text-sm font-black ${theme.text}`}>
          <Icon className="h-4 w-4" />
          {title}
        </span>
        {by && <span className="text-xs font-semibold text-slate-500">โดย {by}</span>}
      </div>
      <div className="space-y-2.5 p-3.5">{children}</div>
    </div>
  );
}

export interface VitalsData {
  weightKg?: number | null;
  heightCm?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseBpm?: number | null;
  chronicDiseaseStatus?: string | null;
  chronicDiseaseDetails?: string | null;
}

function chronicDiseaseText(status: string | null | undefined, details: string | null | undefined, unknown: string) {
  if (status === "YES") return details || "มี";
  if (status === "NONE") return "ไม่มี";
  return unknown;
}

/** สัญญาณชีพและข้อมูลร่างกาย (แสดงเฉพาะค่าที่มี) พร้อม BMI */
export function VitalsGrid({ data, unknownLabel = "ไม่ระบุ" }: { data: VitalsData; unknownLabel?: string }) {
  const { weightKg, heightCm, systolicBp, diastolicBp, pulseBpm, chronicDiseaseStatus } = data;
  const bmi =
    weightKg && heightCm && heightCm > 0 ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toFixed(1) : null;

  const tiles: Array<{ label: string; value: string; sub?: string }> = [];
  if (weightKg != null && heightCm != null) {
    tiles.push({
      label: "น้ำหนัก / ส่วนสูง",
      value: `${weightKg} กก. / ${heightCm} ซม.`,
      sub: bmi ? `BMI ${bmi}` : undefined,
    });
  }
  if (systolicBp != null && diastolicBp != null) {
    tiles.push({ label: "ความดันโลหิต", value: `${systolicBp}/${diastolicBp}`, sub: "mmHg" });
  }
  if (pulseBpm != null) tiles.push({ label: "ชีพจร", value: `${pulseBpm}`, sub: "ครั้ง/นาที" });
  if (chronicDiseaseStatus) {
    tiles.push({
      label: "โรคประจำตัว",
      value: chronicDiseaseText(chronicDiseaseStatus, data.chronicDiseaseDetails, unknownLabel),
    });
  }
  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-400">{tile.label}</p>
          <p className="mt-0.5 break-words text-sm font-black text-slate-900">{tile.value}</p>
          {tile.sub && <p className="text-[11px] font-medium text-slate-400">{tile.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/** ข้อความยาว เช่น อาการผู้ป่วย / ผลวินิจฉัย */
export function TextPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-800">
        {children}
      </p>
    </div>
  );
}

export interface LabItem {
  name: string;
  result: string;
  referenceRange?: string | null;
}

/** ตารางผลตรวจ: จอกว้างเป็นตาราง จอเล็กเป็นรายการซ้อนบรรทัดที่อ่านง่ายกว่า */
export function LabResultTable({ items }: { items: LabItem[] }) {
  return (
    <>
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold text-slate-400">
            <th className="px-3 py-2">รายการตรวจ</th>
            <th className="px-3 py-2">ผลตรวจ</th>
            <th className="px-3 py-2">ค่าอ้างอิง</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.name}-${index}`} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
              <td className="px-3 py-2 font-black text-indigo-700">{item.result}</td>
              <td className="px-3 py-2 font-medium text-slate-500">{item.referenceRange || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-slate-100 sm:hidden">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 text-sm font-semibold text-slate-800">{item.name}</span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-black text-indigo-700">{item.result}</span>
              <span className="block text-[11px] font-medium text-slate-400">
                อ้างอิง {item.referenceRange || "-"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * คำตอบของพยาบาลที่ส่งต่อมาให้สถานีถัดไป: ต่อมไร้ท่อและฮอร์โมนที่พยาบาลเห็นว่าผิดปกติ
 * แสดงเฉพาะสิ่งที่พยาบาลเลือก ไม่บอกว่าถูกหรือผิด สถานีถัดไปต้องวิเคราะห์เอง
 * ไม่แสดงอะไรถ้าเคสนี้ไม่มีคำตอบ (เช่น เคสเก่าก่อนมีตัวเลือก)
 */
export function NurseAnalysis({
  gland,
  hormone,
}: {
  gland: string | null | undefined;
  hormone: string | null | undefined;
}) {
  if (!gland && !hormone) return null;

  return (
    <InfoBlock station="nurse" icon={Microscope} title="คำตอบของพยาบาล">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {[
          ["ต่อมไร้ท่อที่ผิดปกติ", gland],
          ["ฮอร์โมนที่ผิดปกติ", hormone],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-slate-400">{label}</p>
            <p className="text-sm font-black text-slate-800">{value || "—"}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-medium text-slate-400">ความเห็นของพยาบาล อาจถูกหรือผิดก็ได้</p>
    </InfoBlock>
  );
}
