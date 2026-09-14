"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { playClick, playSuccess } from "@/lib/play/sound";

export interface DoctorDiagnosisOption {
  id: string;
  queueNumber?: number | null;
  patientCardId: string | null;
  nurseInterviewId: string | null;
  doctorName: string;
  patientPrefix: string;
  patientFirstName: string;
  patientLastName: string;
  age: number;
  gender: string;
  maritalStatus: string;
  diseaseName: string;
  doctorDiagnosis: string;
  createdAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseBpm?: number | null;
  chronicDiseaseStatus?: string | null;
  chronicDiseaseDetails?: string | null;
  chiefComplaint?: string | null;
  symptomDescription?: string | null;
}

interface MedicineRow {
  id: string;
  name: string;
  tabletCount: string;
}

interface PharmacistDispenseFormProps {
  pharmacist: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialDoctorDiagnoses: DoctorDiagnosisOption[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null; patientName: string; totalTablets: number }
  | { status: "error"; message: string };

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-fuchsia-300 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100";

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-bold text-slate-700">
      {children}
      {required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
    </span>
  );
}

function SectionHeading({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: typeof UserRound;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-700">ส่วนที่ {number}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function PharmacistDispenseForm({
  pharmacist,
  classroom,
  group,
  simulationId,
  initialDoctorDiagnoses,
}: PharmacistDispenseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [diagnoses, setDiagnoses] = useState(initialDoctorDiagnoses);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [medicineRows, setMedicineRows] = useState<MedicineRow[]>([
    { id: "item-1", name: "", tabletCount: "" },
  ]);

  const selectedDiagnosis = diagnoses.find((item) => item.id === selectedDiagnosisId);

  const totalTablets = useMemo(() => {
    return medicineRows.reduce((sum, row) => {
      const count = parseInt(row.tabletCount, 10);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
  }, [medicineRows]);

  function handleAddRow() {
    playClick();
    setMedicineRows((rows) => [
      ...rows,
      { id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, name: "", tabletCount: "" },
    ]);
  }

  function handleRemoveRow(id: string) {
    playClick();
    setMedicineRows((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((r) => r.id !== id);
    });
  }

  function handleRowChange(id: string, field: "name" | "tabletCount", value: string) {
    setMedicineRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function refreshDiagnoses() {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ classroomId: classroom.id, groupId: group.id, simulationId });
      const response = await fetch(`/api/play/doctor-diagnoses?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลผู้ป่วยได้");
      }
      setDiagnoses(result.data);
      if (!result.data.some((item: DoctorDiagnosisOption) => item.id === selectedDiagnosisId)) {
        setSelectedDiagnosisId("");
      }
      setSaveState({ status: "idle" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย",
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDiagnosisId) {
      setSaveState({ status: "error", message: "กรุณาเลือกผู้ป่วยที่รอรับยา" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const cleanMedicines = medicineRows
      .map((row) => ({
        name: row.name.trim(),
        tabletCount: parseInt(row.tabletCount, 10),
      }))
      .filter((row) => row.name.length > 0);

    if (cleanMedicines.length === 0) {
      setSaveState({ status: "error", message: "กรุณาระบุรายการยาอย่างน้อย 1 รายการ" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let i = 0; i < cleanMedicines.length; i++) {
      const item = cleanMedicines[i];
      if (!Number.isInteger(item.tabletCount) || item.tabletCount <= 0) {
        setSaveState({
          status: "error",
          message: `กรุณาระบุจำนวนเม็ดที่ถูกต้องสำหรับ "${item.name}"`,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setSaveState({ status: "saving" });

    const payload = {
      pharmacistId: pharmacist.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      doctorDiagnosisId: selectedDiagnosisId,
      medicines: cleanMedicines,
    };

    try {
      const response = await fetch("/api/play/pharmacy-dispenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถบันทึกการจ่ายยาได้");
      }

      playSuccess();
      formRef.current?.reset();
      const patientName = selectedDiagnosis
        ? `${selectedDiagnosis.patientPrefix}${selectedDiagnosis.patientFirstName} ${selectedDiagnosis.patientLastName}`
        : "ผู้ป่วย";
      setDiagnoses((items) => items.filter((item) => item.id !== selectedDiagnosisId));
      setSelectedDiagnosisId("");
      setMedicineRows([{ id: `item-${Date.now()}`, name: "", tabletCount: "" }]);
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: result.data.queueNumber,
        patientName,
        totalTablets,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกการจ่ายยา",
      });
    }
  }

  function handleReset() {
    playClick();
    formRef.current?.reset();
    setMedicineRows([{ id: `item-${Date.now()}`, name: "", tabletCount: "" }]);
    setSaveState({ status: "idle" });
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-fuchsia-200 bg-white shadow-xl shadow-fuchsia-950/5">
        <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-fuchsia-100">สถานีห้องยา / เภสัชกร</p>
              <h2 className="text-2xl font-bold">บันทึกการจ่ายยา</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-fuchsia-100 bg-fuchsia-50/70 px-5 py-4 text-sm sm:grid-cols-3 sm:px-7">
          <div>
            <span className="block text-xs font-bold text-slate-400">เภสัชกร</span>
            <span className="font-bold text-slate-800">{pharmacist.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400">ห้องเรียน</span>
            <span className="font-bold text-slate-800">{classroom.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400">ห้องตรวจ</span>
            <span className="font-bold text-slate-800">{group.name}</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <div aria-live="polite">
        {saveState.status === "success" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">
                จ่ายยาให้ {saveState.patientName} เรียบร้อยแล้ว (รวม {saveState.totalTablets} เม็ด)
              </p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">
                คิวที่ {saveState.queueNumber ?? saveState.recordId.slice(-8)} เสร็จสิ้นรอบการรักษาผู้ป่วยรายนี้เรียบร้อยแล้ว ★
              </p>
            </div>
          </div>
        )}
        {saveState.status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">ยังบันทึกการจ่ายยาไม่ได้</p>
              <p className="mt-0.5 text-sm font-medium text-rose-700">{saveState.message}</p>
            </div>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" aria-label="แบบฟอร์มการจ่ายยาของเภสัชกร">
        {/* Section 1: Patient info & Doctor Diagnosis */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={UserRound}
            number="1"
            title="ข้อมูลผู้ป่วยและคำสั่งจากแพทย์"
            description="เลือกเคสผู้ป่วยที่แพทย์ตรวจวินิจฉัยแล้วเพื่อดำเนินการจัดยา"
          />

          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <FieldLabel required>เลือกผู้ป่วยที่รอรับยา</FieldLabel>
                <select
                  name="doctorDiagnosisId"
                  required
                  value={selectedDiagnosisId}
                  onChange={(event) => {
                    setSelectedDiagnosisId(event.target.value);
                    setSaveState({ status: "idle" });
                  }}
                  disabled={diagnoses.length === 0}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    {diagnoses.length === 0 ? "ยังไม่มีผู้ป่วยที่ส่งมาจากห้องแพทย์" : "เลือกผู้ป่วย"}
                  </option>
                  {diagnoses.map((item) => (
                    <option key={item.id} value={item.id}>
                      คิวที่ {item.queueNumber ?? "-"}: {item.patientPrefix}{item.patientFirstName} {item.patientLastName} · {item.age} ปี · วินิจฉัย: {item.diseaseName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={refreshDiagnoses}
                disabled={refreshing}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-fuchsia-300 bg-white px-4 text-sm font-bold text-fuchsia-800 transition hover:bg-fuchsia-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                รีเฟรชรายชื่อ
              </button>
            </div>

            {selectedDiagnosis ? (
              <div className="mt-5 space-y-4">
                {/* Basic Demographics */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="ข้อมูลส่วนตัวผู้ป่วย">
                  {[
                    ["คิวตรวจ", `คิวที่ ${selectedDiagnosis.queueNumber ?? "-"}`],
                    [
                      "ชื่อ-นามสกุล",
                      `${selectedDiagnosis.patientPrefix}${selectedDiagnosis.patientFirstName} ${selectedDiagnosis.patientLastName}`,
                    ],
                    ["อายุ", `${selectedDiagnosis.age} ปี`],
                    ["เพศ", selectedDiagnosis.gender],
                    ["สถานภาพ", selectedDiagnosis.maritalStatus],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-fuchsia-100 bg-white px-3.5 py-3 shadow-sm">
                      <span className="block text-xs font-bold text-slate-400">{label}</span>
                      <span className="mt-0.5 block font-bold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Doctor's diagnosis card */}
                <div className="rounded-2xl border border-fuchsia-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-700">
                      <Stethoscope className="h-4 w-4" />
                      <span>ผลการตรวจวินิจฉัยจากแพทย์</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      แพทย์ผู้ตรวจ: {selectedDiagnosis.doctorName}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-xl bg-fuchsia-50/70 p-3">
                      <span className="block text-xs font-bold text-fuchsia-800">โรคที่วินิจฉัย</span>
                      <span className="text-base font-bold text-slate-900">
                        {selectedDiagnosis.diseaseName}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="block text-xs font-bold text-slate-500">การวินิจฉัยโรคของแพทย์</span>
                      <p className="mt-0.5 font-medium leading-relaxed text-slate-800">
                        {selectedDiagnosis.doctorDiagnosis}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient symptoms & vitals reference */}
                {(selectedDiagnosis.chiefComplaint || selectedDiagnosis.systolicBp) && (
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    {selectedDiagnosis.chiefComplaint && (
                      <div className="rounded-xl border border-dashed border-fuchsia-200 bg-white/80 p-3">
                        <span className="font-bold text-slate-500">อาการสำคัญ (CC): </span>
                        <span className="font-medium text-slate-700">{selectedDiagnosis.chiefComplaint}</span>
                      </div>
                    )}
                    {selectedDiagnosis.systolicBp && (
                      <div className="rounded-xl border border-dashed border-fuchsia-200 bg-white/80 p-3">
                        <span className="font-bold text-slate-500">สัญญาณชีพ: </span>
                        <span className="font-medium text-slate-700">
                          BP {selectedDiagnosis.systolicBp}/{selectedDiagnosis.diastolicBp} mmHg · HR {selectedDiagnosis.pulseBpm} bpm
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-fuchsia-200 bg-white/70 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" />
                {diagnoses.length === 0
                  ? "ให้สถานีแพทย์ตรวจวินิจฉัยผู้ป่วยก่อน แล้วกดรีเฟรชรายชื่อ"
                  : "เมื่อเลือกผู้ป่วย ระบบจะแสดงโรคที่แพทย์วินิจฉัยและคำสั่งการรักษาสำหรับจัดยา"}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Medicine Items & Tablet Count */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Pill}
            number="2"
            title="รายการยาและจำนวนเม็ด"
            description="ระบุรายการยาและจำนวนเม็ดที่จ่ายให้กับผู้ป่วย"
          />

          <div className="space-y-4">
            <div className="space-y-3">
              {medicineRows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <FieldLabel required>รายการยา {index + 1}</FieldLabel>
                    <input
                      type="text"
                      required
                      value={row.name}
                      onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                      placeholder="เช่น พาราเซตามอล (Paracetamol) 500 mg"
                      className={fieldClass}
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <FieldLabel required>จำนวนเม็ด</FieldLabel>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="1"
                        max="10000"
                        inputMode="numeric"
                        value={row.tabletCount}
                        onChange={(e) => handleRowChange(row.id, "tabletCount", e.target.value)}
                        placeholder="0"
                        className={`${fieldClass} pr-12`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        เม็ด
                      </span>
                    </div>
                  </div>
                  {medicineRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 hover:border-rose-300"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add row button & Total summary */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fuchsia-300 bg-fuchsia-50/50 px-4 text-sm font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 hover:border-fuchsia-400"
              >
                <Plus className="h-4 w-4" />
                เพิ่มรายการยา
              </button>

              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <span>รวมทั้งหมด:</span>
                <span className="font-bold text-fuchsia-700">{medicineRows.length} รายการ</span>
                <span>·</span>
                <span className="font-bold text-fuchsia-700">{totalTablets} เม็ด</span>
              </div>
            </div>
          </div>
        </section>

        {/* Reserve space so the sticky action bar below never overlaps this content */}
        <div aria-hidden="true" className="h-36 sm:h-20" />

        {/* Action Buttons */}
        <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={saveState.status === "saving"}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            ล้างข้อมูล
          </button>
          <button
            type="submit"
            disabled={saveState.status === "saving" || !selectedDiagnosisId}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-fuchsia-800 border-b-4 bg-fuchsia-600 px-7 text-sm font-bold text-white shadow-lg shadow-fuchsia-600/20 transition hover:bg-fuchsia-700 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState.status === "saving" ? (
              <>
                <Pill className="h-4 w-4 animate-pulse" />
                กำลังจ่ายยา...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกการจ่ายยาและเสร็จสิ้น
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
