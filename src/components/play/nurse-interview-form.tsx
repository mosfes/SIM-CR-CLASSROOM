"use client";

import { useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  IdCard,
  RefreshCw,
  RotateCcw,
  Save,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { playClick, playSuccess } from "@/lib/play/sound";

interface NurseInterviewFormProps {
  nurse: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialPatientCards: PatientCardOption[];
}

interface PatientCardOption {
  id: string;
  queueNumber?: number | null;
  patientPrefix: string;
  patientFirstName: string;
  patientLastName: string;
  age: number;
  gender: string;
  maritalStatus: string;
  createdAt: string;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null }
  | { status: "error"; message: string };

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaClass =
  "mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">ส่วนที่ {number}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function NurseInterviewForm({
  nurse,
  classroom,
  group,
  simulationId,
  initialPatientCards,
}: NurseInterviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [chronicDiseaseStatus, setChronicDiseaseStatus] = useState("NONE");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [patientCards, setPatientCards] = useState(initialPatientCards);
  const [selectedPatientCardId, setSelectedPatientCardId] = useState("");
  const [refreshingCards, setRefreshingCards] = useState(false);
  const selectedPatientCard = patientCards.find((card) => card.id === selectedPatientCardId);

  async function refreshPatientCards() {
    setRefreshingCards(true);
    try {
      const params = new URLSearchParams({ classroomId: classroom.id, groupId: group.id, simulationId });
      const response = await fetch(`/api/play/patient-cards?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถโหลดบัตรผู้ป่วยได้");
      }
      setPatientCards(result.data);
      if (!result.data.some((card: PatientCardOption) => card.id === selectedPatientCardId)) {
        setSelectedPatientCardId("");
      }
      setSaveState({ status: "idle" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดบัตรผู้ป่วย",
      });
    } finally {
      setRefreshingCards(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientCardId) {
      setSaveState({ status: "error", message: "กรุณาเลือกบัตรผู้ป่วยจากห้องบัตร" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaveState({ status: "saving" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      nurseId: nurse.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      patientCardId: selectedPatientCardId,
      weightKg: formData.get("weightKg"),
      heightCm: formData.get("heightCm"),
      systolicBp: formData.get("systolicBp"),
      diastolicBp: formData.get("diastolicBp"),
      pulseBpm: formData.get("pulseBpm"),
      chronicDiseaseStatus,
      chronicDiseaseDetails: formData.get("chronicDiseaseDetails"),
      chiefComplaint: formData.get("chiefComplaint"),
      symptomDescription: formData.get("symptomDescription"),
      notes: formData.get("notes"),
    };

    try {
      const response = await fetch("/api/play/nurse-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถบันทึกข้อมูลได้");
      }

      playSuccess();
      formRef.current?.reset();
      setChronicDiseaseStatus("NONE");
      setPatientCards((cards) => cards.filter((card) => card.id !== selectedPatientCardId));
      setSelectedPatientCardId("");
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: result.data.queueNumber,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    }
  }

  function handleReset() {
    playClick();
    formRef.current?.reset();
    setChronicDiseaseStatus("NONE");
    setSelectedPatientCardId("");
    setSaveState({ status: "idle" });
  }

  const recordedDate = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-emerald-950/5">
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-5 py-5 text-white sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-100">สถานีพยาบาล</p>
                <h2 className="text-2xl font-bold">แบบฟอร์มการซักประวัติ</h2>
              </div>
            </div>
            <div className="rounded-2xl bg-black/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15">
              วันที่บันทึก {recordedDate}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 text-sm sm:grid-cols-3 sm:px-7">
          <div>
            <span className="block text-xs font-bold text-slate-400">ผู้ซักประวัติ</span>
            <span className="font-bold text-slate-800">{nurse.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400">ห้องเรียน</span>
            <span className="font-bold text-slate-800">{classroom.name}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400">กลุ่ม</span>
            <span className="font-bold text-slate-800">{group.name}</span>
          </div>
        </div>
      </section>

      <div aria-live="polite">
        {saveState.status === "success" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">บันทึกข้อมูลเรียบร้อยแล้ว</p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">
                คิวที่ {saveState.queueNumber ?? saveState.recordId.slice(-8)} บันทึกเรียบร้อย ส่งต่อไปยังสถานีเทคนิคการแพทย์แล้ว
              </p>
            </div>
          </div>
        )}
        {saveState.status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">ยังบันทึกข้อมูลไม่ได้</p>
              <p className="mt-0.5 text-sm font-medium text-rose-700">{saveState.message}</p>
            </div>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" aria-label="แบบฟอร์มการซักประวัติผู้ป่วย">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={UserRound}
            number="1"
            title="ข้อมูลผู้ป่วย"
            description="เลือกข้อมูลประจำตัวที่ส่งมาจากห้องบัตร"
          />

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <FieldLabel required>เลือกบัตรผู้ป่วยที่รอซักประวัติ</FieldLabel>
                <select
                  name="patientCardId"
                  required
                  value={selectedPatientCardId}
                  onChange={(event) => {
                    setSelectedPatientCardId(event.target.value);
                    setSaveState({ status: "idle" });
                  }}
                  disabled={patientCards.length === 0}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    {patientCards.length === 0 ? "ยังไม่มีบัตรผู้ป่วยจากห้องบัตร" : "เลือกผู้ป่วย"}
                  </option>
                  {patientCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      คิวที่ {card.queueNumber ?? "-"}: {card.patientPrefix}{card.patientFirstName} {card.patientLastName} · {card.age} ปี · {card.gender} · {card.maritalStatus}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={refreshPatientCards}
                disabled={refreshingCards}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingCards ? "animate-spin" : ""}`} />
                รีเฟรชรายชื่อ
              </button>
            </div>

            {selectedPatientCard ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="ข้อมูลจากห้องบัตร">
                {[
                  ["คิวตรวจ", `คิวที่ ${selectedPatientCard.queueNumber ?? "-"}`],
                  [
                    "ชื่อ-นามสกุล",
                    `${selectedPatientCard.patientPrefix}${selectedPatientCard.patientFirstName} ${selectedPatientCard.patientLastName}`,
                  ],
                  ["อายุ", `${selectedPatientCard.age} ปี`],
                  ["เพศ", selectedPatientCard.gender],
                  ["สถานภาพ", selectedPatientCard.maritalStatus],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-emerald-100 bg-white px-3.5 py-3 shadow-sm">
                    <span className="block text-xs font-bold text-slate-400">{label}</span>
                    <span className="mt-0.5 block font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-emerald-200 bg-white/70 p-3 text-sm font-medium text-slate-500">
                <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {patientCards.length === 0
                  ? "ให้เจ้าหน้าที่ห้องบัตรออกบัตรผู้ป่วยก่อน แล้วกดรีเฟรชรายชื่อ"
                  : "เมื่อเลือกบัตร ระบบจะแสดงชื่อ-นามสกุล อายุ เพศ และสถานภาพจากห้องบัตรตรงนี้"}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Activity}
            number="2"
            title="สัญญาณชีพ"
            description="วัดและบันทึกค่าที่ได้จากผู้ป่วย"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <FieldLabel required>น้ำหนัก</FieldLabel>
              <div className="relative">
                <input name="weightKg" type="number" required min="1" max="500" step="0.1" inputMode="decimal" className={`${fieldClass} pr-14`} placeholder="0.0" />
                <span className="pointer-events-none absolute right-3 top-1/2 translate-y-[-30%] text-sm font-bold text-slate-400">กก.</span>
              </div>
            </label>
            <label>
              <FieldLabel required>ส่วนสูง</FieldLabel>
              <div className="relative">
                <input name="heightCm" type="number" required min="30" max="250" step="0.1" inputMode="decimal" className={`${fieldClass} pr-14`} placeholder="0.0" />
                <span className="pointer-events-none absolute right-3 top-1/2 translate-y-[-30%] text-sm font-bold text-slate-400">ซม.</span>
              </div>
            </label>
            <div>
              <FieldLabel required>ความดันโลหิต</FieldLabel>
              <div className="mt-1.5 flex items-center gap-2">
                <input name="systolicBp" type="number" required min="40" max="300" inputMode="numeric" aria-label="ความดันตัวบน" className={`${fieldClass} mt-0 min-w-0 px-2 text-center`} placeholder="120" />
                <span className="font-bold text-slate-300">/</span>
                <input name="diastolicBp" type="number" required min="20" max="200" inputMode="numeric" aria-label="ความดันตัวล่าง" className={`${fieldClass} mt-0 min-w-0 px-2 text-center`} placeholder="80" />
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-400">มม.ปรอท</p>
            </div>
            <label>
              <FieldLabel required>ชีพจร</FieldLabel>
              <div className="relative">
                <input name="pulseBpm" type="number" required min="20" max="250" inputMode="numeric" className={`${fieldClass} pr-16`} placeholder="72" />
                <span className="pointer-events-none absolute right-3 top-1/2 translate-y-[-30%] text-sm font-bold text-slate-400">ครั้ง/นาที</span>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Stethoscope}
            number="3"
            title="ประวัติการเจ็บป่วย"
            description="ฟังคำตอบของผู้ป่วยแล้วสรุปด้วยภาษาที่ชัดเจน"
          />

          <fieldset>
            <legend><FieldLabel required>โรคประจำตัว</FieldLabel></legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                { value: "NONE", label: "ไม่มี" },
                { value: "UNKNOWN", label: "ไม่ทราบ" },
                { value: "YES", label: "มีโรคประจำตัว" },
              ].map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="chronicDiseaseStatus"
                    value={option.value}
                    checked={chronicDiseaseStatus === option.value}
                    onChange={() => setChronicDiseaseStatus(option.value)}
                  />
                  <span className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-emerald-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {chronicDiseaseStatus === "YES" && (
            <label className="mt-4 block">
              <FieldLabel required>ระบุโรคประจำตัว</FieldLabel>
              <input name="chronicDiseaseDetails" required maxLength={2000} className={fieldClass} placeholder="เช่น เบาหวาน ความดันโลหิตสูง" />
            </label>
          )}

          <div className="mt-5 grid gap-5">
            <label>
              <FieldLabel required>สาเหตุที่มาพบแพทย์</FieldLabel>
              <textarea name="chiefComplaint" required maxLength={2000} rows={3} className={textareaClass} placeholder="ผู้ป่วยมาพบแพทย์เพราะอะไร และเริ่มมีอาการเมื่อใด" />
            </label>
            <label>
              <FieldLabel required>ลักษณะอาการ</FieldLabel>
              <textarea name="symptomDescription" required maxLength={5000} rows={5} className={textareaClass} placeholder="บันทึกอาการสำคัญ ตำแหน่ง ความรุนแรง ระยะเวลา และสิ่งที่ทำให้อาการดีขึ้นหรือแย่ลง" />
            </label>
            <label>
              <FieldLabel>บันทึกเพิ่มเติม</FieldLabel>
              <textarea name="notes" maxLength={5000} rows={6} className={textareaClass} placeholder="ข้อมูลอื่นที่ควรส่งต่อให้ห้องแล็บและแพทย์ เช่น ประวัติแพ้ยา ยาที่ใช้ หรือข้อสังเกตจากการสัมภาษณ์" />
            </label>
          </div>
        </section>

        {/* Reserve space so the sticky action bar below never overlaps this content */}
        <div aria-hidden="true" className="h-36 sm:h-20" />

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
            disabled={saveState.status === "saving"}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-800 border-b-4 bg-emerald-600 px-7 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState.status === "saving" ? (
              <>
                <HeartPulse className="h-4 w-4 animate-pulse" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกและส่งต่อ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
