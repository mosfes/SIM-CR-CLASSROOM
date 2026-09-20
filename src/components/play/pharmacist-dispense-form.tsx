"use client";

import { useRef, useState } from "react";
import { AppSelect } from "@/components/ui/app-select";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Info,
  Pill,
  RefreshCw,
  RotateCcw,
  Save,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { playClick, playSuccess } from "@/lib/play/sound";
import { formatPatientCode } from "@/lib/patient-code";
import { PHARMACY_MAX_SCORE, type PharmacyChoiceOption } from "@/lib/pharmacy-choices";

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
  treatmentPlan?: string | null;
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
  nurseNotes?: string | null;
  labResult?: {
    id: string;
    medTechName: string;
    items: { name: string; result: string; referenceRange: string }[];
    notes: string | null;
    createdAt: string;
  } | null;
}

interface PharmacistDispenseFormProps {
  pharmacist: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialDoctorDiagnoses: DoctorDiagnosisOption[];
  /** ตัวเลือก A-U ที่รวบรวมจากเฉลยของโรคในฐานข้อมูล */
  hormoneOptions: PharmacyChoiceOption[];
  /** ตัวเลือก ก-ธ ที่รวบรวมจากเฉลยของโรคในฐานข้อมูล */
  treatmentOptions: PharmacyChoiceOption[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null; patientName: string }
  | { status: "error"; message: string };

/** dropdown เลือกตัวเลือกตามใบงาน (A-U / ก-ธ) ตัวเลือกยาวจะถูกจำกัด 2 บรรทัด แล้วแสดงเต็มในการ์ดใต้ช่องเลือก */
function ChoiceSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  placeholder: string;
  options: PharmacyChoiceOption[];
  value: string;
  onChange: (key: string) => void;
  isDisabled: boolean;
}) {
  return (
    <AppSelect
      isRequired
      fullWidth
      tone="fuchsia"
      label={label}
      placeholder={placeholder}
      emptyText="ยังไม่มีตัวเลือกในระบบ"
      options={options.map((option) => ({ value: option.key, label: option.label, badge: option.key }))}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
    />
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
  hormoneOptions,
  treatmentOptions,
}: PharmacistDispenseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [diagnoses, setDiagnoses] = useState(initialDoctorDiagnoses);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [hormoneChoiceKey, setHormoneChoiceKey] = useState("");
  const [treatmentChoiceKey, setTreatmentChoiceKey] = useState("");

  const selectedDiagnosis = diagnoses.find((item) => item.id === selectedDiagnosisId);
  const selectedHormone = hormoneOptions.find((option) => option.key === hormoneChoiceKey);
  const selectedTreatment = treatmentOptions.find((option) => option.key === treatmentChoiceKey);
  const choicesUnavailable = hormoneOptions.length === 0 || treatmentOptions.length === 0;

  function clearChoices() {
    setHormoneChoiceKey("");
    setTreatmentChoiceKey("");
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
        clearChoices();
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
    if (!hormoneChoiceKey) {
      setSaveState({ status: "error", message: "กรุณาเลือกความผิดปกติของฮอร์โมน (A-U)" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!treatmentChoiceKey) {
      setSaveState({ status: "error", message: "กรุณาเลือกยา/การรักษาที่ควรได้รับ (ก-ธ)" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaveState({ status: "saving" });

    const payload = {
      pharmacistId: pharmacist.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      doctorDiagnosisId: selectedDiagnosisId,
      hormoneChoiceKey,
      treatmentChoiceKey,
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
      clearChoices();
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: result.data.queueNumber,
        patientName,
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
    clearChoices();
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
              <h2 className="text-2xl font-bold">วิเคราะห์และจ่ายยา</h2>
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
              <p className="font-bold">ส่งคำตอบสำหรับ {saveState.patientName} เรียบร้อยแล้ว</p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">
                รหัสผู้ป่วย {saveState.queueNumber != null ? formatPatientCode(saveState.queueNumber) : saveState.recordId.slice(-8)} เสร็จสิ้นรอบการรักษาผู้ป่วยรายนี้เรียบร้อยแล้ว ★
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
        {/* Section 1: Patient info & the whole chain of data */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={UserRound}
            number="1"
            title="ข้อมูลที่ส่งต่อกันมาทั้งหมด"
            description="อ่านอาการจากพยาบาล ผลตรวจจากเทคนิคการแพทย์ และคำวินิจฉัยของแพทย์ประกอบกัน"
          />

          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <AppSelect
                isRequired
                tone="fuchsia"
                className="min-w-0 flex-1"
                fullWidth
                name="doctorDiagnosisId"
                label="เลือกผู้ป่วยที่รอรับยา"
                placeholder="เลือกผู้ป่วย"
                emptyText="ยังไม่มีผู้ป่วยที่ส่งมาจากห้องแพทย์"
                options={diagnoses.map((item) => ({
                  value: item.id,
                  label: `รหัสผู้ป่วย ${formatPatientCode(item.queueNumber)}: ${item.patientPrefix}${item.patientFirstName} ${item.patientLastName} · ${item.age} ปี`,
                }))}
                value={selectedDiagnosisId}
                onChange={(id) => {
                  setSelectedDiagnosisId(id);
                  clearChoices();
                  setSaveState({ status: "idle" });
                }}
                isDisabled={diagnoses.length === 0}
              />
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
                    ["รหัสผู้ป่วย", formatPatientCode(selectedDiagnosis.queueNumber)],
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

                {/* Nurse handover */}
                <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                    <Stethoscope className="h-4 w-4" />
                    <span>ข้อมูลจากพยาบาล</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {selectedDiagnosis.symptomDescription && (
                      <div className="rounded-xl bg-teal-50/70 p-3">
                        <span className="block text-xs font-bold text-teal-800">อาการผู้ป่วย</span>
                        <p className="mt-0.5 whitespace-pre-wrap font-medium leading-relaxed text-slate-800">
                          {selectedDiagnosis.symptomDescription}
                        </p>
                      </div>
                    )}
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {selectedDiagnosis.systolicBp != null && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <span className="font-bold text-slate-500">สัญญาณชีพ: </span>
                          <span className="font-medium text-slate-700">
                            BP {selectedDiagnosis.systolicBp}/{selectedDiagnosis.diastolicBp} mmHg · HR{" "}
                            {selectedDiagnosis.pulseBpm} bpm
                          </span>
                        </div>
                      )}
                      {selectedDiagnosis.chronicDiseaseStatus && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <span className="font-bold text-slate-500">โรคประจำตัว: </span>
                          <span className="font-medium text-slate-700">
                            {selectedDiagnosis.chronicDiseaseStatus === "YES"
                              ? selectedDiagnosis.chronicDiseaseDetails || "มีโรคประจำตัว"
                              : selectedDiagnosis.chronicDiseaseStatus === "NONE"
                                ? "ไม่มี"
                                : "ไม่ทราบ"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lab results from the med tech */}
                <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                      <FlaskConical className="h-4 w-4" />
                      <span>ผลตรวจจากเทคนิคการแพทย์</span>
                    </div>
                    {selectedDiagnosis.labResult && (
                      <span className="text-xs font-semibold text-slate-400">
                        ผู้ส่งตรวจ: {selectedDiagnosis.labResult.medTechName}
                      </span>
                    )}
                  </div>
                  {selectedDiagnosis.labResult && selectedDiagnosis.labResult.items.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-indigo-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-indigo-50 text-indigo-900">
                          <tr>
                            <th className="px-3 py-2 font-bold">รายการตรวจ</th>
                            <th className="px-3 py-2 font-bold">ผลตรวจ</th>
                            <th className="px-3 py-2 font-bold">ค่าอ้างอิง</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50">
                          {selectedDiagnosis.labResult.items.map((item, index) => (
                            <tr key={`${item.name}-${index}`} className="bg-white">
                              <td className="px-3 py-2 font-semibold text-slate-700">{item.name}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">{item.result}</td>
                              <td className="px-3 py-2 font-medium text-slate-400">
                                {item.referenceRange || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-500">
                      เคสนี้ไม่มีผลตรวจทางห้องปฏิบัติการแนบมา
                    </p>
                  )}
                  {selectedDiagnosis.labResult?.notes && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
                      หมายเหตุจากห้องแล็บ: {selectedDiagnosis.labResult.notes}
                    </p>
                  )}
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
                      <span className="block text-xs font-bold text-fuchsia-800">โรคที่แพทย์วินิจฉัย</span>
                      <span className="text-base font-bold text-slate-900">
                        {selectedDiagnosis.diseaseName}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="block text-xs font-bold text-slate-500">การวินิจฉัยโรคของแพทย์</span>
                      <p className="mt-0.5 whitespace-pre-wrap font-medium leading-relaxed text-slate-800">
                        {selectedDiagnosis.doctorDiagnosis}
                      </p>
                    </div>
                    {selectedDiagnosis.treatmentPlan && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="block text-xs font-bold text-slate-500">แผนการรักษาที่แพทย์เสนอ</span>
                        <p className="mt-0.5 whitespace-pre-wrap font-medium leading-relaxed text-slate-800">
                          {selectedDiagnosis.treatmentPlan}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    ข้อมูลที่ส่งต่อกันมาอาจถูกหรือผิดก็ได้ ระบบจะไม่บอกว่าแพทย์วินิจฉัยถูกไหม
                    หรือเทคนิคการแพทย์ส่งผลตรวจมาถูกชุดไหม ให้เภสัชกรวิเคราะห์เองจากอาการและค่าผลตรวจ
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-fuchsia-200 bg-white/70 p-3 text-sm font-medium text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" />
                {diagnoses.length === 0
                  ? "ให้สถานีแพทย์ตรวจวินิจฉัยผู้ป่วยก่อน แล้วกดรีเฟรชรายชื่อ"
                  : "เมื่อเลือกผู้ป่วย ระบบจะแสดงอาการ ผลตรวจ และคำวินิจฉัยของแพทย์ให้วิเคราะห์"}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: the two answer choices */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Pill}
            number="2"
            title={`คำตอบของเภสัชกร (${PHARMACY_MAX_SCORE} คะแนน)`}
            description={`เลือกความผิดปกติของฮอร์โมน (A-U) และยา/การรักษา (ก-ธ) ตามใบงาน · ถูก 1 ข้อ = 2 คะแนน, ถูกทั้ง 2 ข้อ = ${PHARMACY_MAX_SCORE} คะแนน`}
          />

          <div className="space-y-4">
            <div>
              <ChoiceSelect
                label="ความผิดปกติของฮอร์โมน (A-U)"
                placeholder="เลือกตัวเลือก A-U"
                options={hormoneOptions}
                value={hormoneChoiceKey}
                onChange={(key) => {
                  setHormoneChoiceKey(key);
                  setSaveState({ status: "idle" });
                }}
                isDisabled={!selectedDiagnosisId || hormoneOptions.length === 0}
              />
              {selectedHormone && (
                <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-600 text-sm font-black text-white">
                    {selectedHormone.key}
                  </span>
                  <p className="text-sm font-bold leading-relaxed text-slate-800">{selectedHormone.label}</p>
                </div>
              )}
            </div>

            <div>
              <ChoiceSelect
                label="ยา/การรักษาที่ควรได้รับ (ก-ธ)"
                placeholder="เลือกตัวเลือก ก-ธ"
                options={treatmentOptions}
                value={treatmentChoiceKey}
                onChange={(key) => {
                  setTreatmentChoiceKey(key);
                  setSaveState({ status: "idle" });
                }}
                isDisabled={!selectedDiagnosisId || treatmentOptions.length === 0}
              />
              {selectedTreatment && (
                <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-600 text-sm font-black text-white">
                    {selectedTreatment.key}
                  </span>
                  <p className="text-sm font-bold leading-relaxed text-slate-800">{selectedTreatment.label}</p>
                </div>
              )}
            </div>

            {choicesUnavailable ? (
              <p className="flex items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ยังไม่มีตัวเลือก A-U / ก-ธ ในระบบ ให้คุณครูกรอกเฉลยของแต่ละโรคที่หน้าจัดการข้อมูลโรคก่อน
              </p>
            ) : (
              !selectedDiagnosisId && (
                <p className="flex items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-500">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  เลือกผู้ป่วยในส่วนที่ 1 ก่อน จึงจะตอบตัวเลือกได้
                </p>
              )
            )}
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
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกคำตอบและเสร็จสิ้น
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
