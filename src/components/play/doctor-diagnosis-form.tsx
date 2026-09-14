"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { playClick, playSuccess } from "@/lib/play/sound";
import { formatPatientCode } from "@/lib/patient-code";

export interface NurseInterviewOption {
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
  labResult: {
    id: string;
    medTechName: string;
    items: DiseaseLabResult[];
    notes: string | null;
    createdAt: string;
  } | null;
}

export interface DiseaseOption {
  id: string;
  code: string;
  name: string;
}

interface DoctorDiagnosisFormProps {
  doctor: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialNurseInterviews: NurseInterviewOption[];
  diseases: DiseaseOption[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null; patientName: string }
  | { status: "error"; message: string };

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

const textareaClass =
  "mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">ส่วนที่ {number}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function DoctorDiagnosisForm({
  doctor,
  classroom,
  group,
  simulationId,
  initialNurseInterviews,
  diseases,
}: DoctorDiagnosisFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [interviews, setInterviews] = useState(initialNurseInterviews);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [selectedDiseaseId, setSelectedDiseaseId] = useState("");
  const [searchDiseaseTerm, setSearchDiseaseTerm] = useState("");
  const [isDiseaseDropdownOpen, setIsDiseaseDropdownOpen] = useState(false);
  const diseaseDropdownRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (diseaseDropdownRef.current && !diseaseDropdownRef.current.contains(event.target as Node)) {
        setIsDiseaseDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDiseases = useMemo(() => {
    if (!diseases || diseases.length === 0) return [];
    if (!searchDiseaseTerm.trim()) return diseases;
    const q = searchDiseaseTerm.toLowerCase().trim();
    return diseases.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
    );
  }, [diseases, searchDiseaseTerm]);

  const selectedInterview = interviews.find((item) => item.id === selectedInterviewId);

  const bmi = useMemo(() => {
    if (!selectedInterview?.weightKg || !selectedInterview?.heightCm) return null;
    const heightInMeters = selectedInterview.heightCm / 100;
    if (heightInMeters <= 0) return null;
    return (selectedInterview.weightKg / (heightInMeters * heightInMeters)).toFixed(1);
  }, [selectedInterview]);

  async function refreshInterviews() {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ classroomId: classroom.id, groupId: group.id, simulationId });
      const response = await fetch(`/api/play/nurse-interviews?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลผู้ป่วยได้");
      }
      setInterviews(result.data);
      if (!result.data.some((item: NurseInterviewOption) => item.id === selectedInterviewId)) {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInterviewId) {
      setSaveState({ status: "error", message: "กรุณาเลือกผู้ป่วยที่รอการตรวจวินิจฉัย" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!selectedDiseaseId) {
      setSaveState({ status: "error", message: "กรุณาเลือกโรค" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaveState({ status: "saving" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      doctorId: doctor.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      nurseInterviewId: selectedInterviewId,
      diseaseId: selectedDiseaseId,
      doctorDiagnosis: formData.get("doctorDiagnosis"),
    };

    try {
      const response = await fetch("/api/play/doctor-diagnoses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถบันทึกผลการวินิจฉัยได้");
      }

      playSuccess();
      formRef.current?.reset();
      const patientName = selectedInterview
        ? `${selectedInterview.patientPrefix}${selectedInterview.patientFirstName} ${selectedInterview.patientLastName}`
        : "ผู้ป่วย";
      const qNum = result.data?.queueNumber ?? selectedInterview?.queueNumber;
      setInterviews((items) => items.filter((item) => item.id !== selectedInterviewId));
      setSelectedInterviewId("");
      setSelectedDiseaseId("");
      setSearchDiseaseTerm("");
      setIsDiseaseDropdownOpen(false);
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: qNum,
        patientName,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกผลการวินิจฉัย",
      });
    }
  }

  function handleReset() {
    playClick();
    formRef.current?.reset();
    setSelectedDiseaseId("");
    setSearchDiseaseTerm("");
    setIsDiseaseDropdownOpen(false);
    setSaveState({ status: "idle" });
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-xl shadow-sky-950/5">
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-100">สถานีแพทย์ / ตรวจวินิจฉัย</p>
              <h2 className="text-2xl font-bold">บันทึกการวินิจฉัยโรค</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-4 text-sm sm:grid-cols-3 sm:px-7">
          <div>
            <span className="block text-xs font-bold text-slate-400">แพทย์ผู้ตรวจ</span>
            <span className="font-bold text-slate-800">{doctor.name}</span>
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
              <p className="font-bold">บันทึกผลการวินิจฉัยให้ {saveState.patientName} เรียบร้อยแล้ว</p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">
                รหัสผู้ป่วย {saveState.queueNumber != null ? formatPatientCode(saveState.queueNumber) : saveState.recordId.slice(-8)} บันทึกเรียบร้อย ข้อมูลพร้อมส่งต่อไปยังสถานีเภสัชกร
              </p>
            </div>
          </div>
        )}
        {saveState.status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">ยังบันทึกผลการวินิจฉัยไม่ได้</p>
              <p className="mt-0.5 text-sm font-medium text-rose-700">{saveState.message}</p>
            </div>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" aria-label="แบบฟอร์มการวินิจฉัยโรคของแพทย์">
        {/* Section 1: Patient info from Nurse */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={UserRound}
            number="1"
            title="ข้อมูลผู้ป่วยและผลตรวจ"
            description="เลือกเคสผู้ป่วยที่ผ่านการซักประวัติจากพยาบาลและมีผลแล็บจากเทคนิคการแพทย์แล้ว"
          />

          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <FieldLabel required>เลือกผู้ป่วยที่รอการตรวจวินิจฉัย</FieldLabel>
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
                    {interviews.length === 0 ? "ยังไม่มีผู้ป่วยที่มีผลแล็บพร้อมตรวจ" : "เลือกผู้ป่วย"}
                  </option>
                  {interviews.map((item) => (
                    <option key={item.id} value={item.id}>
                      รหัสผู้ป่วย {formatPatientCode(item.queueNumber)}: {item.patientPrefix}{item.patientFirstName} {item.patientLastName} · {item.age} ปี · {item.gender} · {item.maritalStatus}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={refreshInterviews}
                disabled={refreshing}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-bold text-sky-800 transition hover:bg-sky-100 disabled:opacity-60"
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
                    <div key={label} className="rounded-xl border border-sky-100 bg-white px-3.5 py-3 shadow-sm">
                      <span className="block text-xs font-bold text-slate-400">{label}</span>
                      <span className="mt-0.5 block font-bold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Vital Signs Grid */}
                <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
                    <HeartPulse className="h-4 w-4" />
                    <span>สัญญาณชีพและข้อมูลร่างกาย</span>
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
                <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <span className="block text-xs font-bold text-slate-400">อาการผู้ป่วย</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
                    {selectedInterview.symptomDescription}
                  </p>
                </div>

                {selectedInterview.notes && (
                  <div className="rounded-xl border border-dashed border-sky-200 bg-white/80 px-4 py-2.5 text-xs font-medium text-slate-600">
                    <span className="font-bold text-sky-800">หมายเหตุจากพยาบาล: </span>
                    {selectedInterview.notes}
                  </div>
                )}

                {/* Lab report from the medical technologist */}
                {selectedInterview.labResult && (
                  <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                        <FlaskConical className="h-4 w-4" />
                        <span>ผลตรวจทางห้องปฏิบัติการ</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        โดยเทคนิคการแพทย์: {selectedInterview.labResult.medTechName}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-125 text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-400">
                            <th className="px-4 py-2.5">รายการตรวจ</th>
                            <th className="px-4 py-2.5">ผลตรวจ</th>
                            <th className="px-4 py-2.5">ค่าอ้างอิง</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInterview.labResult.items.map((item, index) => (
                            <tr key={`${item.name}-${index}`} className="border-b border-slate-50 last:border-0">
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{item.name}</td>
                              <td className="px-4 py-2.5 font-bold text-indigo-700">{item.result}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-500">
                                {item.referenceRange || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedInterview.labResult.notes && (
                      <div className="border-t border-indigo-100 bg-indigo-50/40 px-4 py-2.5 text-xs font-medium text-slate-600">
                        <span className="font-bold text-indigo-800">หมายเหตุจากห้องแล็บ: </span>
                        {selectedInterview.labResult.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-sky-200 bg-white/70 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                {interviews.length === 0
                  ? "ให้สถานีพยาบาลซักประวัติ และเทคนิคการแพทย์ส่งผลแล็บมาก่อน แล้วกดรีเฟรชรายชื่อ"
                  : "เมื่อเลือกผู้ป่วย ระบบจะแสดงสัญญาณชีพ ประวัติอาการจากพยาบาล และผลตรวจทางห้องปฏิบัติการให้ตรวจวินิจฉัย"}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Doctor Diagnosis */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Activity}
            number="2"
            title="การวินิจฉัยโรค"
            description="บันทึกผลการวินิจฉัยและเลือกโรค"
          />

          <div className="space-y-4">
            {/* Doctor's clinical diagnosis */}
            <div>
              <label className="block">
                <FieldLabel required>การวินิจฉัยโรคของแพทย์</FieldLabel>
                <textarea
                  name="doctorDiagnosis"
                  required
                  rows={3}
                  maxLength={5000}
                  className={textareaClass}
                  placeholder="ระบุผลการวินิจฉัยโรค รายละเอียดการตรวจทางคลินิก หรือเหตุผลประกอบการวินิจฉัย..."
                />
              </label>
            </div>

            {/* Searchable Disease Dropdown */}
            <div ref={diseaseDropdownRef}>
              <FieldLabel required>เลือกโรค</FieldLabel>
              <div className="relative mt-1.5">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchDiseaseTerm}
                    onChange={(e) => {
                      setSearchDiseaseTerm(e.target.value);
                      setSelectedDiseaseId("");
                      setIsDiseaseDropdownOpen(true);
                    }}
                    onFocus={() => setIsDiseaseDropdownOpen(true)}
                    placeholder="ค้นหา หรือเลือกโรค..."
                    className={`${fieldClass} !mt-0 pl-9.5 pr-8`}
                    autoComplete="off"
                  />
                  {searchDiseaseTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDiseaseTerm("");
                        setSelectedDiseaseId("");
                        setIsDiseaseDropdownOpen(false);
                      }}
                      className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                      title="ล้างข้อมูล"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Hidden input to pass diseaseId */}
                <input type="hidden" name="diseaseId" value={selectedDiseaseId} />

                {/* Searchable Dropdown Popup */}
                {isDiseaseDropdownOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-sky-200 bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
                    {filteredDiseases.length > 0 ? (
                      <div className="space-y-0.5">
                        {filteredDiseases.map((disease) => {
                          const isSelected = selectedDiseaseId === disease.id;
                          return (
                            <button
                              key={disease.id}
                              type="button"
                              onClick={() => {
                                setSelectedDiseaseId(disease.id);
                                setSearchDiseaseTerm(disease.name);
                                setIsDiseaseDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-sky-100/80 text-sky-950 font-bold"
                                  : "text-slate-700 hover:bg-sky-50"
                              }`}
                            >
                              <span className="truncate">{disease.name}</span>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-700" />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {searchDiseaseTerm.trim() ? (
                          <p>ไม่พบโรคที่ตรงกับ &ldquo;{searchDiseaseTerm}&rdquo;</p>
                        ) : (
                          <p>ไม่มีข้อมูลโรคในระบบ</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedDiseaseId && (
                <p className="mt-1 text-[11px] text-sky-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  โรคที่เลือก: <span className="font-bold">{searchDiseaseTerm}</span>
                </p>
              )}
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
            disabled={saveState.status === "saving" || !selectedInterviewId}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-sky-800 border-b-4 bg-sky-500 px-7 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState.status === "saving" ? (
              <>
                <FileText className="h-4 w-4 animate-pulse" />
                กำลังตรวจและประเมินผลโดย AI...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกการวินิจฉัยและส่งต่อ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
