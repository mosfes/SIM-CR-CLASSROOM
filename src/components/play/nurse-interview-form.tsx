"use client";

import { useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  IdCard,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { playClick, playSuccess } from "@/lib/play/sound";
import { formatPatientCode } from "@/lib/patient-code";
import { NURSE_MAX_SCORE } from "@/lib/nurse-choices";

interface NurseInterviewFormProps {
  nurse: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  initialPatientCards: PatientCardOption[];
  /** ตัวเลือกต่อมไร้ท่อที่ผิดปกติ (รวมจากเฉลยของทุกโรค ไม่ซ้ำกัน) */
  glandOptions: string[];
  /** ตัวเลือกฮอร์โมนที่ผิดปกติ (รวมจากเฉลยของทุกโรค ไม่ซ้ำกัน) */
  hormoneOptions: string[];
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
  symptoms: string | null;
  createdAt: string;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null }
  | { status: "error"; message: string };

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

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
  glandOptions,
  hormoneOptions,
}: NurseInterviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [patientCards, setPatientCards] = useState(initialPatientCards);
  const [selectedPatientCardId, setSelectedPatientCardId] = useState("");
  const [refreshingCards, setRefreshingCards] = useState(false);
  const [glandChoice, setGlandChoice] = useState("");
  const [hormoneChoice, setHormoneChoice] = useState("");
  const selectedPatientCard = patientCards.find((card) => card.id === selectedPatientCardId);
  // ครูยังไม่ได้กรอกตัวเลือกให้โรคใดเลย: ไม่บังคับตอบ เพื่อไม่ให้การซักประวัติค้างทั้งสถานี
  const choicesAvailable = glandOptions.length > 0 && hormoneOptions.length > 0;

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
        setGlandChoice("");
        setHormoneChoice("");
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
    if (!selectedPatientCard?.symptoms) {
      setSaveState({ status: "error", message: "บัตรผู้ป่วยนี้ยังไม่มีข้อมูลอาการจากโรค กรุณาให้ห้องบัตรเลือกโรคใหม่" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (choicesAvailable && !glandChoice) {
      setSaveState({ status: "error", message: "กรุณาเลือกต่อมไร้ท่อที่ผิดปกติ" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (choicesAvailable && !hormoneChoice) {
      setSaveState({ status: "error", message: "กรุณาเลือกฮอร์โมนที่ผิดปกติ" });
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
      endocrineGlandChoice: glandChoice,
      abnormalHormoneChoice: hormoneChoice,
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
      setPatientCards((cards) => cards.filter((card) => card.id !== selectedPatientCardId));
      setSelectedPatientCardId("");
      setGlandChoice("");
      setHormoneChoice("");
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
    setSelectedPatientCardId("");
    setGlandChoice("");
    setHormoneChoice("");
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
            <span className="block text-xs font-bold text-slate-400">ห้องตรวจ</span>
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
                รหัสผู้ป่วย {saveState.queueNumber != null ? formatPatientCode(saveState.queueNumber) : saveState.recordId.slice(-8)} บันทึกเรียบร้อย ส่งต่อไปยังสถานีเทคนิคการแพทย์แล้ว
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
              <AppSelect
                isRequired
                fullWidth
                tone="emerald"
                className="min-w-0 flex-1"
                name="patientCardId"
                label="เลือกบัตรผู้ป่วยที่รอซักประวัติ"
                placeholder="เลือกผู้ป่วย"
                emptyText="ยังไม่มีบัตรผู้ป่วยจากห้องบัตร"
                options={patientCards.map((item) => ({
                  value: item.id,
                  label: `รหัสผู้ป่วย ${formatPatientCode(item.queueNumber)}: ${item.patientPrefix}${item.patientFirstName} ${item.patientLastName} · ${item.age} ปี · ${item.gender} · ${item.maritalStatus}`,
                }))}
                value={selectedPatientCardId}
                onChange={(id) => {
                  setSelectedPatientCardId(id);
                  setSaveState({ status: "idle" });
                }}
                isDisabled={patientCards.length === 0}
              />
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
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="ข้อมูลจากห้องบัตร">
                  {[
                    ["รหัสผู้ป่วย", formatPatientCode(selectedPatientCard.queueNumber)],
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
                <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3.5 py-3 shadow-sm">
                  <span className="block text-xs font-bold text-slate-400">อาการจากโรค</span>
                  <span className="mt-1 block whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
                    {selectedPatientCard.symptoms || "ไม่พบข้อมูลอาการของโรค"}
                  </span>
                </div>
              </>
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
            description="กรอกเฉพาะค่าวัดจากผู้ป่วย แล้วกดส่งต่อ"
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
            title="อาการผู้ป่วย"
            description="ระบบดึงอาการจากโรคที่ห้องบัตรเลือกไว้ให้อัตโนมัติ ไม่ต้องพิมพ์ซ้ำ"
          />
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm font-medium leading-relaxed text-slate-700">
            {selectedPatientCard ? (
              selectedPatientCard.symptoms || "ไม่พบข้อมูลอาการของโรค กรุณาให้ห้องบัตรเลือกโรคใหม่"
            ) : (
              "เลือกบัตรผู้ป่วยด้านบนเพื่อดูอาการจากโรค"
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <SectionHeading
            icon={Stethoscope}
            number="4"
            title={`วิเคราะห์ความผิดปกติ (${NURSE_MAX_SCORE} คะแนน)`}
            description="อ่านอาการของผู้ป่วยแล้วเลือกต่อมไร้ท่อและฮอร์โมนที่น่าจะผิดปกติ · ถูกข้อละ 1 คะแนน"
          />

          {choicesAvailable ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AppSelect
                  isRequired
                  fullWidth
                  tone="emerald"
                  label="ต่อมไร้ท่อที่ผิดปกติ"
                  placeholder="เลือกต่อมไร้ท่อ"
                  options={glandOptions.map((option) => ({ value: option, label: option }))}
                  value={glandChoice}
                  onChange={(value) => {
                    setGlandChoice(value);
                    setSaveState({ status: "idle" });
                  }}
                />
                <AppSelect
                  isRequired
                  fullWidth
                  tone="emerald"
                  label="ฮอร์โมนที่ผิดปกติ"
                  placeholder="เลือกฮอร์โมน"
                  options={hormoneOptions.map((option) => ({ value: option, label: option }))}
                  value={hormoneChoice}
                  onChange={(value) => {
                    setHormoneChoice(value);
                    setSaveState({ status: "idle" });
                  }}
                />
              </div>
              <p className="flex items-start gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-sm font-medium text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ตัวเลือกเดียวเป็นคำตอบของหลายโรคได้ (เช่น หลายโรคเกิดจากต่อมเดียวกัน) ให้เลือกจากอาการของผู้ป่วยรายนี้
              </p>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ยังไม่มีตัวเลือกต่อมไร้ท่อ/ฮอร์โมนในระบบ ให้คุณครูกรอกเฉลยของแต่ละโรคที่หน้าจัดการข้อมูลโรคก่อน
              (ตอนนี้ข้ามส่วนนี้ได้)
            </p>
          )}
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
                กำลังส่งต่อ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                บันทึกสัญญาณชีพ คำตอบ และส่งต่อ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
