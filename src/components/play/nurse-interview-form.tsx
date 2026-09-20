"use client";

import { useRef, useState } from "react";
import { HeartPulse, Info, Save, Stethoscope, UserRound } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { playClick, playSuccess } from "@/lib/play/sound";
import { NURSE_MAX_SCORE } from "@/lib/nurse-choices";
import { PatientIdentity, QueuePicker, TextPanel } from "@/components/play/kit/patient-ui";
import {
  ActionBar,
  ErrorBanner,
  FieldLabel,
  FormSection,
  Hint,
  StationHero,
  SuccessBanner,
  UnitInput,
} from "@/components/play/kit/station-ui";
import { STICKY_COLUMN, inputClass } from "@/components/play/kit/theme";
import { formatPatientCode } from "@/lib/patient-code";

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

  return (
    <div className="space-y-4">
      <StationHero
        roleId="nurse"
        title="ซักประวัติและวัดสัญญาณชีพ"
        description="รับบัตรผู้ป่วยจากห้องบัตร วัดสัญญาณชีพ แล้ววิเคราะห์ว่าต่อมไร้ท่อและฮอร์โมนใดที่น่าจะผิดปกติ"
      />

      <div aria-live="polite" className="space-y-3">
        {saveState.status === "success" && (
          <SuccessBanner
            roleId="nurse"
            title="บันทึกข้อมูลเรียบร้อยแล้ว"
            queueNumber={saveState.queueNumber}
            fallbackCode={saveState.recordId.slice(-4)}
            detail="รับผู้ป่วยรายถัดไปจากรายชื่อทางซ้ายได้เลย"
          />
        )}
        {saveState.status === "error" && <ErrorBanner title="ยังบันทึกข้อมูลไม่ได้" message={saveState.message} />}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-label="แบบฟอร์มการซักประวัติผู้ป่วย">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <div className={STICKY_COLUMN}>
            <FormSection
              roleId="nurse"
              number={1}
              title="เลือกผู้ป่วยจากห้องบัตร"
              description="กดเลือกผู้ป่วยที่จะซักประวัติ ระบบจะแสดงข้อมูลและอาการให้"
              done={!!selectedPatientCard}
            >
              <QueuePicker
                roleId="nurse"
                label="ผู้ป่วยที่รอซักประวัติ"
                items={patientCards.map((card) => ({
                  id: card.id,
                  queueNumber: card.queueNumber,
                  name: `${card.patientPrefix}${card.patientFirstName} ${card.patientLastName}`,
                  meta: `${card.age} ปี · ${card.gender} · ${card.maritalStatus}`,
                }))}
                selectedId={selectedPatientCardId}
                onSelect={(id) => {
                  setSelectedPatientCardId(id);
                  setSaveState({ status: "idle" });
                }}
                onRefresh={refreshPatientCards}
                refreshing={refreshingCards}
                emptyText="ยังไม่มีบัตรผู้ป่วยจากห้องบัตร ให้เจ้าหน้าที่ห้องบัตรออกบัตรก่อน แล้วกดรีเฟรช"
              />

              {selectedPatientCard && (
                <div className="mt-4 space-y-3">
                  <PatientIdentity
                    roleId="nurse"
                    queueNumber={selectedPatientCard.queueNumber}
                    name={`${selectedPatientCard.patientPrefix}${selectedPatientCard.patientFirstName} ${selectedPatientCard.patientLastName}`}
                    age={selectedPatientCard.age}
                    gender={selectedPatientCard.gender}
                    maritalStatus={selectedPatientCard.maritalStatus}
                  />
                  {selectedPatientCard.symptoms ? (
                    <TextPanel label="อาการจากโรค (ระบบดึงมาให้ ไม่ต้องพิมพ์ซ้ำ)">{selectedPatientCard.symptoms}</TextPanel>
                  ) : (
                    <Hint tone="warning" icon={Stethoscope}>
                      ไม่พบข้อมูลอาการของโรค กรุณาให้ห้องบัตรเลือกโรคใหม่
                    </Hint>
                  )}
                </div>
              )}
            </FormSection>
          </div>

          <div className="space-y-4">
            <FormSection
              roleId="nurse"
              number={2}
              title="สัญญาณชีพ"
              description="กรอกค่าที่วัดได้จากผู้ป่วยให้ครบทุกช่อง"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <UnitInput
                  roleId="nurse"
                  label="น้ำหนัก"
                  unit="กก."
                  name="weightKg"
                  type="number"
                  required
                  min="1"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0.0"
                />
                <UnitInput
                  roleId="nurse"
                  label="ส่วนสูง"
                  unit="ซม."
                  name="heightCm"
                  type="number"
                  required
                  min="30"
                  max="250"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0.0"
                />
                <div>
                  <FieldLabel required>ความดันโลหิต</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      name="systolicBp"
                      type="number"
                      required
                      min="40"
                      max="300"
                      inputMode="numeric"
                      aria-label="ความดันตัวบน"
                      className={`${inputClass("nurse")} min-w-0 px-2 text-center`}
                      placeholder="120"
                    />
                    <span className="mt-1.5 text-lg font-bold text-slate-300">/</span>
                    <input
                      name="diastolicBp"
                      type="number"
                      required
                      min="20"
                      max="200"
                      inputMode="numeric"
                      aria-label="ความดันตัวล่าง"
                      className={`${inputClass("nurse")} min-w-0 px-2 text-center`}
                      placeholder="80"
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">ตัวบน / ตัวล่าง (มม.ปรอท)</p>
                </div>
                <UnitInput
                  roleId="nurse"
                  label="ชีพจร"
                  unit="ครั้ง/นาที"
                  name="pulseBpm"
                  type="number"
                  required
                  min="20"
                  max="250"
                  inputMode="numeric"
                  placeholder="72"
                />
              </div>
            </FormSection>

            <FormSection
              roleId="nurse"
              number={3}
              title={`วิเคราะห์ความผิดปกติ (${NURSE_MAX_SCORE} คะแนน)`}
              description="อ่านอาการของผู้ป่วยทางซ้ายแล้วเลือกต่อมไร้ท่อและฮอร์โมนที่น่าจะผิดปกติ · ต้องถูกทั้ง 2 ช่องจึงได้ 1 คะแนน"
              done={choicesAvailable && !!glandChoice && !!hormoneChoice}
            >
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
                  <Hint icon={Info}>
                    ตัวเลือกเดียวเป็นคำตอบของหลายโรคได้ (เช่น หลายโรคเกิดจากต่อมเดียวกัน) ให้เลือกจากอาการของผู้ป่วยรายนี้
                  </Hint>
                </div>
              ) : (
                <Hint tone="warning">
                  ยังไม่มีตัวเลือกต่อมไร้ท่อ/ฮอร์โมนในระบบ ให้คุณครูกรอกเฉลยของแต่ละโรคที่หน้าจัดการข้อมูลโรคก่อน (ตอนนี้ข้ามส่วนนี้ได้)
                </Hint>
              )}
            </FormSection>
          </div>
        </div>

        <ActionBar
          roleId="nurse"
          saving={saveState.status === "saving"}
          hint={
            selectedPatientCard
              ? `ผู้ป่วยรหัส ${formatPatientCode(selectedPatientCard.queueNumber)} — กรอกสัญญาณชีพและเลือกคำตอบให้ครบ`
              : "เริ่มจากเลือกผู้ป่วยในส่วนที่ 1"
          }
          submitLabel="บันทึกและส่งต่อ"
          savingLabel="กำลังส่งต่อ..."
          submitIcon={Save}
          savingIcon={HeartPulse}
          onReset={handleReset}
        />
      </form>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs font-medium text-slate-400">
        <UserRound className="h-3.5 w-3.5" />
        ผู้ซักประวัติ: {nurse.name}
      </p>
    </div>
  );
}
