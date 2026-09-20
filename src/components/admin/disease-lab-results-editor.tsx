"use client";

import { Plus, Trash2 } from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { LAB_RESULT_MAX_ROWS } from "@/lib/disease-lab-results";

export const emptyLabResultRow: DiseaseLabResult = {
  name: "",
  result: "",
  referenceRange: "",
};

export function DiseaseLabResultsEditor({
  rows,
  onChange,
  disabled = false,
  namePrefix,
}: {
  rows: DiseaseLabResult[];
  onChange: (rows: DiseaseLabResult[]) => void;
  disabled?: boolean;
  namePrefix: string;
}) {
  const updateRow = (index: number, patch: Partial<DiseaseLabResult>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ ...emptyLabResultRow }]);
  };

  const addRow = () => {
    if (rows.length >= LAB_RESULT_MAX_ROWS) return;
    onChange([...rows, { ...emptyLabResultRow }]);
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10";

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span>รายการตรวจ</span>
        <span>ผลตรวจ</span>
        <span>ค่าอ้างอิง</span>
        <span className="w-8" />
      </div>

      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
        >
          <input
            type="text"
            name={`${namePrefix}_lab_name_${index}`}
            autoComplete="off"
            disabled={disabled}
            placeholder="เช่น Total calcium, TSH, HbA1c"
            value={row.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            name={`${namePrefix}_lab_result_${index}`}
            autoComplete="off"
            disabled={disabled}
            placeholder="เช่น 7.0 mg/dL ↓"
            value={row.result}
            onChange={(e) => updateRow(index, { result: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            name={`${namePrefix}_lab_reference_${index}`}
            autoComplete="off"
            disabled={disabled}
            placeholder="เช่น 8.5–10.5"
            value={row.referenceRange}
            onChange={(e) => updateRow(index, { referenceRange: e.target.value })}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            disabled={disabled}
            title="ลบรายการตรวจนี้"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || rows.length >= LAB_RESULT_MAX_ROWS}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>เพิ่มรายการตรวจ</span>
        </button>
        <span className="text-[10px] text-slate-400">
          ไม่เกิน {LAB_RESULT_MAX_ROWS} รายการ • เว้นว่างได้หากโรคนี้ไม่มีผลตรวจ
        </span>
      </div>
    </div>
  );
}

export function DiseaseLabResultsTable({ rows }: { rows: DiseaseLabResult[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
        ยังไม่มีผลตรวจทางห้องปฏิบัติการสำหรับโรคนี้
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2.5">รายการ</th>
            <th className="px-3 py-2.5">ผลตรวจ</th>
            <th className="px-3 py-2.5">ค่าอ้างอิง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.result}</td>
              <td className="px-3 py-2.5 text-slate-500">{row.referenceRange || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ตัวเลือกของสถานีห้องยาที่ผูกกับโรคนี้:
 * ความผิดปกติของฮอร์โมน (A-U) และยา/การรักษา (ก-ธ) ตามใบงาน
 * ทั้งสองช่องต้องกรอกคู่กัน หรือเว้นว่างทั้งคู่เมื่อโรคนี้ยังไม่มีเฉลย
 */
export function DiseasePharmacyChoicesEditor({
  namePrefix,
  hormoneKey,
  hormoneLabel,
  treatmentKey,
  treatmentLabel,
  onChange,
  disabled = false,
}: {
  namePrefix: string;
  hormoneKey: string;
  hormoneLabel: string;
  treatmentKey: string;
  treatmentLabel: string;
  onChange: (field: "hormoneKey" | "hormoneLabel" | "treatmentKey" | "treatmentLabel", value: string) => void;
  disabled?: boolean;
}) {
  const inputClass =
    "w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 disabled:bg-slate-50";

  return (
    <div className="space-y-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-slate-600">ตัวอักษร (A-U)</label>
          <input
            type="text"
            maxLength={8}
            name={`${namePrefix}_hormone_choice_key`}
            autoComplete="off"
            placeholder="A"
            value={hormoneKey}
            disabled={disabled}
            onChange={(e) => onChange("hormoneKey", e.target.value)}
            className={`${inputClass} text-center font-mono font-bold`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-slate-600">
            ความผิดปกติของฮอร์โมน
          </label>
          <input
            type="text"
            maxLength={191}
            name={`${namePrefix}_hormone_choice_label`}
            autoComplete="off"
            placeholder="เช่น Ca²⁺ ↓"
            value={hormoneLabel}
            disabled={disabled}
            onChange={(e) => onChange("hormoneLabel", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-slate-600">ตัวอักษร (ก-ธ)</label>
          <input
            type="text"
            maxLength={8}
            name={`${namePrefix}_treatment_choice_key`}
            autoComplete="off"
            placeholder="ก"
            value={treatmentKey}
            disabled={disabled}
            onChange={(e) => onChange("treatmentKey", e.target.value)}
            className={`${inputClass} text-center font-mono font-bold`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-slate-600">ยา/การรักษา</label>
          <textarea
            rows={2}
            maxLength={2000}
            name={`${namePrefix}_treatment_choice_label`}
            autoComplete="off"
            placeholder="เช่น Calcium gluconate, Calcium carbonate, Vitamin D / Calcitriol"
            value={treatmentLabel}
            disabled={disabled}
            onChange={(e) => onChange("treatmentLabel", e.target.value)}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>
      </div>
    </div>
  );
}
