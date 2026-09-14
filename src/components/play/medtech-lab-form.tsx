"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  HeartPulse,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { playClick, playSuccess } from "@/lib/play/sound";
import { formatPatientCode } from "@/lib/patient-code";

export interface LabQueueOption {
  id: string;
  queueNumber?: number | null;
  patientCardId: string | null;
  nurseName: string;
  patientPrefix: string;
  patientFirstName: string;
  patientLastName: string;
  age: number;
  gender: string;
  maritalStatus: string;
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
  createdAt: string;
}

export interface LabPanelOption {
  id: string;
  items: DiseaseLabResult[];
}

interface MedTechLabFormProps {
  medTech: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialLabQueue: LabQueueOption[];
  labPanels: LabPanelOption[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | {
      status: "success";
      recordId: string;
      queueNumber?: number | null;
      patientName: string;
      itemCount: number;
    }
  | { status: "error"; message: string };

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">ส่วนที่ {number}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function MedTechLabForm({
  medTech,
  classroom,
  group,
  simulationId,
  initialLabQueue,
  labPanels,
}: MedTechLabFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [interviews, setInterviews] = useState(initialLabQueue);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [searchPanelTerm, setSearchPanelTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ชุดตรวจถูกเรียงมาแบบสุ่มจากเซิร์ฟเวอร์ ป้ายกำกับจึงอ้างอิงลำดับที่แสดงเท่านั้น
  const numberedPanels = useMemo(
    () => labPanels.map((panel, index) => ({ ...panel, label: `ชุดตรวจที่ ${index + 1}` })),
    [labPanels]
  );

  const filteredPanels = useMemo(() => {
    const q = searchPanelTerm.toLowerCase().trim();
    if (!q) return numberedPanels;
    return numberedPanels.filter((panel) =>
      panel.items.some(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.result.toLowerCase().includes(q)
      )
    );
  }, [numberedPanels, searchPanelTerm]);

  const selectedInterview = interviews.find((item) => item.id === selectedInterviewId);
  const selectedPanel = numberedPanels.find((panel) => panel.id === selectedPanelId);

  const bmi = useMemo(() => {
    if (!selectedInterview?.weightKg || !selectedInterview?.heightCm) return null;
    const heightInMeters = selectedInterview.heightCm / 100;
    if (heightInMeters <= 0) return null;
    return (selectedInterview.weightKg / (heightInMeters * heightInMeters)).toFixed(1);
  }, [selectedInterview]);

  async function refreshQueue() {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ classroomId: classroom.id, groupId: group.id, simulationId });
      const response = await fetch(`/api/play/lab-results?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลผู้ป่วยได้");
      }
      setInterviews(result.data);
      if (!result.data.some((item: LabQueueOption) => item.id === selectedInterviewId)) {
        setSelectedInterviewId("");
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

  function clearPanelSelection() {
    setSelectedPanelId("");
    setSearchPanelTerm("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInterviewId) {
      setSaveState({ status: "error", message: "กรุณาเลือกผู้ป่วยที่รอผลตรวจ" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!selectedPanelId) {
      setSaveState({ status: "error", message: "กรุณาเลือกชุดผลตรวจที่จะส่งให้แพทย์" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaveState({ status: "saving" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      medTechId: medTech.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      nurseInterviewId: selectedInterviewId,
      panelDiseaseId: selectedPanelId,
      notes: formData.get("notes"),
    };

    try {
      const response = await fetch("/api/play/lab-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถส่งผลตรวจได้");
      }

      playSuccess();
      formRef.current?.reset();
      const patientName = selectedInterview
        ? `${selectedInterview.patientPrefix}${selectedInterview.patientFirstName} ${selectedInterview.patientLastName}`
        : "ผู้ป่วย";
      const qNum = result.data?.queueNumber ?? selectedInterview?.queueNumber;
      setInterviews((items) => items.filter((item) => item.id !== selectedInterviewId));
      setSelectedInterviewId("");
      clearPanelSelection();
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: qNum,
        patientName,
        itemCount: result.data?.itemCount ?? 0,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการส่งผลตรวจ",
      });
    }
  }

  function handleReset() {
    playClick();
    formRef.current?.reset();
    clearPanelSelection();
    setSaveState({ status: "idle" });
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-xl shadow-indigo-950/5">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-100">สถานีห้องปฏิบัติการ / เทคนิคการแพทย์</p>
              <h2 className="text-2xl font-bold">ส่งผลตรวจทางห้องปฏิบัติการ</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-indigo-100 bg-indigo-50/70 px-5 py-4 text-sm sm:grid-cols-3 sm:px-7">
          <div>
            <span className="block text-xs font-bold text-slate-400">นักเทคนิคการแพทย์</span>
            <span className="font-bold text-slate-800">{medTech.name}</span>
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
                ส่งผลตรวจของ {saveState.patientName} เรียบร้อยแล้ว ({saveState.itemCount} รายการ)
              </p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">
                รหัสผู้ป่วย {saveState.queueNumber != null ? formatPatientCode(saveState.queueNumber) : saveState.recordId.slice(-8)} ผลแล็บถูกส่งต่อไปยังสถานีแพทย์แล้ว ★
              </p>
            </div>
          </div>
        )}
        {saveState.status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">ยังส่งผลตรวจไม่ได้</p>
              <p className="mt-0.5 text-sm font-medium text-rose-700">{saveState.message}</p>
            </div>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" aria-label="แบบฟอร์มส่งผลตรวจของเทคนิคการแพทย์">
        {/* Section 1: Patient info from Nurse */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={UserRound}
            number="1"
            title="ข้อมูลผู้ป่วยจากพยาบาล"
            description="อ่านสัญญาณชีพและอาการที่พยาบาลซักมา เพื่อเลือกชุดผลตรวจให้เหมาะสม"
          />

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <FieldLabel required>เลือกผู้ป่วยที่รอผลตรวจ</FieldLabel>
                <select
                  name="nurseInterviewId"
                  required
                  value={selectedInterviewId}
                  onChange={(event) => {
                    setSelectedInterviewId(event.target.value);
                    setSaveState({ status: "idle" });
                  }}
                  disabled={interviews.length === 0}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    {interviews.length === 0 ? "ยังไม่มีผู้ป่วยที่ส่งมาจากห้องพยาบาล" : "เลือกผู้ป่วย"}
                  </option>
                  {interviews.map((item) => (
                    <option key={item.id} value={item.id}>
                      รหัสผู้ป่วย {formatPatientCode(item.queueNumber)}: {item.patientPrefix}{item.patientFirstName} {item.patientLastName} · {item.age} ปี · {item.gender}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={refreshQueue}
                disabled={refreshing}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-bold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                รีเฟรชรายชื่อ
              </button>
            </div>

            {selectedInterview ? (
              <div className="mt-5 space-y-4">
                {/* Basic Demographics */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="ข้อมูลส่วนตัวผู้ป่วย">
                  {[
                    ["รหัสผู้ป่วย", formatPatientCode(selectedInterview.queueNumber)],
                    [
                      "ชื่อ-นามสกุล",
                      `${selectedInterview.patientPrefix}${selectedInterview.patientFirstName} ${selectedInterview.patientLastName}`,
                    ],
                    ["อายุ", `${selectedInterview.age} ปี`],
                    ["เพศ", selectedInterview.gender],
                    ["สถานภาพ", selectedInterview.maritalStatus],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-indigo-100 bg-white px-3.5 py-3 shadow-sm">
                      <span className="block text-xs font-bold text-slate-400">{label}</span>
                      <span className="mt-0.5 block font-bold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Vital Signs Grid */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                      <HeartPulse className="h-4 w-4" />
                      <span>สัญญาณชีพและข้อมูลร่างกาย</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      พยาบาลผู้ซักประวัติ: {selectedInterview.nurseName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 text-sm">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-400">น้ำหนัก / ส่วนสูง</span>
                      <span className="font-bold text-slate-800">
                        {selectedInterview.weightKg} กก. / {selectedInterview.heightCm} ซม.
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-400">BMI</span>
                      <span className="font-bold text-slate-800">{bmi ?? "-"}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-400">ความดันโลหิต</span>
                      <span className="font-bold text-slate-800">
                        {selectedInterview.systolicBp}/{selectedInterview.diastolicBp} mmHg
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-400">ชีพจร</span>
                      <span className="font-bold text-slate-800">{selectedInterview.pulseBpm} bpm</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 col-span-2 sm:col-span-1">
                      <span className="block text-xs font-semibold text-slate-400">โรคประจำตัว</span>
                      <span className="font-bold text-slate-800">
                        {selectedInterview.chronicDiseaseStatus === "YES"
                          ? selectedInterview.chronicDiseaseDetails || "มี"
                          : selectedInterview.chronicDiseaseStatus === "NONE"
                          ? "ไม่มี"
                          : "ไม่ระบุ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Symptoms supplied by the card room */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <span className="block text-xs font-bold text-slate-400">อาการผู้ป่วย</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
                    {selectedInterview.symptomDescription}
                  </p>
                </div>

                {selectedInterview.notes && (
                  <div className="rounded-xl border border-dashed border-indigo-200 bg-white/80 px-4 py-2.5 text-xs font-medium text-slate-600">
                    <span className="font-bold text-indigo-800">หมายเหตุจากพยาบาล: </span>
                    {selectedInterview.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-indigo-200 bg-white/70 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                {interviews.length === 0
                  ? "ให้สถานีพยาบาลซักประวัติผู้ป่วยก่อน แล้วกดรีเฟรชรายชื่อ"
                  : "เมื่อเลือกผู้ป่วย ระบบจะแสดงสัญญาณชีพและอาการที่พยาบาลซักมาให้ใช้ประกอบการเลือกชุดผลตรวจ"}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Lab panel selection */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={FlaskConical}
            number="2"
            title="เลือกชุดผลตรวจที่จะส่งให้แพทย์"
            description="อ่านค่าผลตรวจในแต่ละชุด แล้วเลือกชุดที่สอดคล้องกับอาการของผู้ป่วยเพื่อส่งไปยังสถานีแพทย์"
          />

          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex min-w-0 flex-1 items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchPanelTerm}
                  onChange={(e) => setSearchPanelTerm(e.target.value)}
                  placeholder="ค้นหาจากชื่อรายการตรวจหรือค่าผล เช่น IGF-1, TSH, Cortisol..."
                  className={`${fieldClass} !mt-0 pl-9.5 pr-8`}
                  autoComplete="off"
                  disabled={numberedPanels.length === 0}
                />
                {searchPanelTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchPanelTerm("")}
                    className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="ล้างคำค้นหา"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {filteredPanels.length} / {numberedPanels.length} ชุดตรวจ
              </span>
            </div>

            <input type="hidden" name="panelDiseaseId" value={selectedPanelId} />

            {numberedPanels.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                ยังไม่มีชุดผลตรวจในระบบ ให้คุณครูเพิ่มผลตรวจในหน้าจัดการโรคก่อน
              </div>
            ) : filteredPanels.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                ไม่พบชุดตรวจที่มีรายการตรงกับ &ldquo;{searchPanelTerm}&rdquo;
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label="ชุดผลตรวจทางห้องปฏิบัติการ"
                className="grid max-h-[70vh] gap-3 overflow-y-auto rounded-2xl bg-slate-50/60 p-2 sm:p-3 lg:grid-cols-2"
              >
                {filteredPanels.map((panel) => {
                  const isSelected = selectedPanelId === panel.id;
                  return (
                    <div
                      key={panel.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        playClick();
                        setSelectedPanelId(panel.id);
                        setSaveState({ status: "idle" });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          playClick();
                          setSelectedPanelId(panel.id);
                          setSaveState({ status: "idle" });
                        }
                      }}
                      className={`cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm outline-none transition ${
                        isSelected
                          ? "border-indigo-500 ring-4 ring-indigo-100"
                          : "border-slate-200 hover:border-indigo-300 focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${
                          isSelected
                            ? "border-indigo-100 bg-indigo-50"
                            : "border-slate-100 bg-slate-50/80"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          {panel.label}
                        </span>
                        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          {panel.items.length} รายการ
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold text-slate-400">
                              <th className="px-3.5 py-2">รายการตรวจ</th>
                              <th className="px-3.5 py-2">ผลตรวจ</th>
                              <th className="px-3.5 py-2">ค่าอ้างอิง</th>
                            </tr>
                          </thead>
                          <tbody>
                            {panel.items.map((item, index) => (
                              <tr
                                key={`${item.name}-${index}`}
                                className="border-b border-slate-50 last:border-0"
                              >
                                <td className="px-3.5 py-2 font-semibold text-slate-800">{item.name}</td>
                                <td className="px-3.5 py-2 font-bold text-indigo-700">{item.result}</td>
                                <td className="px-3.5 py-2 font-medium text-slate-500">
                                  {item.referenceRange || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPanel && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-indigo-700">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                ชุดผลตรวจที่เลือก: <span className="font-bold">{selectedPanel.label}</span> (
                {selectedPanel.items.length} รายการ)
              </p>
            )}

            <label className="block">
              <FieldLabel>หมายเหตุถึงแพทย์ (ถ้ามี)</FieldLabel>
              <textarea
                name="notes"
                rows={3}
                maxLength={5000}
                className={textareaClass}
                placeholder="เช่น ค่าที่ผิดปกติที่ควรสังเกต หรือข้อจำกัดของสิ่งส่งตรวจ..."
              />
            </label>
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
            disabled={saveState.status === "saving" || !selectedInterviewId || !selectedPanelId}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-indigo-800 border-b-4 bg-indigo-600 px-7 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState.status === "saving" ? (
              <>
                <Send className="h-4 w-4 animate-pulse" />
                กำลังส่งผลตรวจ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                ส่งผลตรวจให้แพทย์
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
