"use client";

import { useRef, useState } from "react";
import { FlaskConical, HeartPulse, Pill, Save, Stethoscope, TriangleAlert } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { playClick, playSuccess } from "@/lib/play/sound";
import { PHARMACY_MAX_SCORE, type PharmacyChoiceOption } from "@/lib/pharmacy-choices";
import {
  InfoBlock,
  LabResultTable,
  NurseAnalysis,
  PatientIdentity,
  QueuePicker,
  TextPanel,
  VitalsGrid,
} from "@/components/play/kit/patient-ui";
import {
  ActionBar,
  ErrorBanner,
  FormSection,
  Hint,
  StationHero,
  SuccessBanner,
} from "@/components/play/kit/station-ui";
import { STICKY_COLUMN } from "@/components/play/kit/theme";

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
  endocrineGlandChoice?: string | null;
  abnormalHormoneChoice?: string | null;
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
  const selected = options.find((option) => option.key === value);
  return (
    <div>
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
      {selected && (
        <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-600 text-sm font-black text-white">
            {selected.key}
          </span>
          <p className="text-sm font-bold leading-relaxed text-slate-800">{selected.label}</p>
        </div>
      )}
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
    <div className="space-y-4">
      <StationHero
        roleId="pharmacist"
        title="วิเคราะห์และจ่ายยา"
        description="อ่านข้อมูลที่ส่งต่อกันมาทั้งหมด แล้ววิเคราะห์ความผิดปกติของฮอร์โมนและเลือกยา/การรักษาที่เหมาะสม"
      />

      <div aria-live="polite" className="space-y-3">
        {saveState.status === "success" && (
          <SuccessBanner
            roleId="pharmacist"
            title={`ส่งคำตอบสำหรับ ${saveState.patientName} เรียบร้อยแล้ว`}
            queueNumber={saveState.queueNumber}
            fallbackCode={saveState.recordId.slice(-4)}
            detail="รับผู้ป่วยรายถัดไปได้เลย"
          />
        )}
        {saveState.status === "error" && <ErrorBanner title="ยังบันทึกการจ่ายยาไม่ได้" message={saveState.message} />}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-label="แบบฟอร์มการจ่ายยาของเภสัชกร">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
          {/* ซ้าย: ข้อมูลที่ส่งต่อกันมาทั้งหมด (ค้างอยู่ขณะเลือกคำตอบ) */}
          <div className={STICKY_COLUMN}>
            <FormSection
              roleId="pharmacist"
              number={1}
              title="ข้อมูลที่ส่งต่อกันมาทั้งหมด"
              description="อ่านอาการจากพยาบาล ผลตรวจจากเทคนิคการแพทย์ และคำวินิจฉัยของแพทย์ประกอบกัน"
              done={!!selectedDiagnosis}
            >
              <QueuePicker
                roleId="pharmacist"
                label="ผู้ป่วยที่รอรับยา"
                items={diagnoses.map((item) => ({
                  id: item.id,
                  queueNumber: item.queueNumber,
                  name: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`,
                  meta: `${item.age} ปี · ${item.gender}`,
                }))}
                selectedId={selectedDiagnosisId}
                onSelect={(id) => {
                  setSelectedDiagnosisId(id);
                  clearChoices();
                  setSaveState({ status: "idle" });
                }}
                onRefresh={refreshDiagnoses}
                refreshing={refreshing}
                emptyText="ยังไม่มีผู้ป่วยที่ส่งมาจากห้องแพทย์ ให้สถานีแพทย์ตรวจวินิจฉัยก่อน แล้วกดรีเฟรช"
              />

              {selectedDiagnosis && (
                <div className="mt-4 space-y-3">
                  <PatientIdentity
                    roleId="pharmacist"
                    queueNumber={selectedDiagnosis.queueNumber}
                    name={`${selectedDiagnosis.patientPrefix}${selectedDiagnosis.patientFirstName} ${selectedDiagnosis.patientLastName}`}
                    age={selectedDiagnosis.age}
                    gender={selectedDiagnosis.gender}
                    maritalStatus={selectedDiagnosis.maritalStatus}
                  />

                  <Hint tone="warning" icon={TriangleAlert}>
                    ข้อมูลที่ส่งต่อกันมาอาจถูกหรือผิดก็ได้ ระบบจะไม่บอกว่าแพทย์วินิจฉัยถูกไหม
                    หรือเทคนิคการแพทย์ส่งผลตรวจมาถูกชุดไหม ให้เภสัชกรวิเคราะห์เองจากอาการและค่าผลตรวจ
                  </Hint>

                  <InfoBlock station="nurse" icon={HeartPulse} title="ข้อมูลจากพยาบาล">
                    <VitalsGrid data={selectedDiagnosis} unknownLabel="ไม่ทราบ" />
                    {selectedDiagnosis.symptomDescription && (
                      <TextPanel label="อาการผู้ป่วย">{selectedDiagnosis.symptomDescription}</TextPanel>
                    )}
                  </InfoBlock>

                  <NurseAnalysis
                    gland={selectedDiagnosis.endocrineGlandChoice}
                    hormone={selectedDiagnosis.abnormalHormoneChoice}
                  />

                  <InfoBlock
                    station="medtech"
                    icon={FlaskConical}
                    title="ผลตรวจจากเทคนิคการแพทย์"
                    by={selectedDiagnosis.labResult?.medTechName}
                  >
                    {selectedDiagnosis.labResult && selectedDiagnosis.labResult.items.length > 0 ? (
                      <div className="-mx-3.5 -mb-3.5 border-t border-slate-100">
                        <LabResultTable items={selectedDiagnosis.labResult.items} />
                        {selectedDiagnosis.labResult.notes && (
                          <p className="border-t border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 text-xs font-medium text-slate-600">
                            <span className="font-bold text-indigo-800">หมายเหตุจากห้องแล็บ: </span>
                            {selectedDiagnosis.labResult.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-500">
                        เคสนี้ไม่มีผลตรวจทางห้องปฏิบัติการแนบมา
                      </p>
                    )}
                  </InfoBlock>

                  <InfoBlock
                    station="doctor"
                    icon={Stethoscope}
                    title="ผลการวินิจฉัยจากแพทย์"
                    by={selectedDiagnosis.doctorName}
                  >
                    <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3.5 py-3">
                      <p className="text-[11px] font-bold text-sky-800">โรคที่แพทย์วินิจฉัย</p>
                      <p className="text-base font-black text-slate-900">{selectedDiagnosis.diseaseName}</p>
                    </div>
                    <TextPanel label="การวินิจฉัยโรคของแพทย์">{selectedDiagnosis.doctorDiagnosis}</TextPanel>
                    {selectedDiagnosis.treatmentPlan && (
                      <TextPanel label="แผนการรักษาที่แพทย์เสนอ">{selectedDiagnosis.treatmentPlan}</TextPanel>
                    )}
                  </InfoBlock>
                </div>
              )}
            </FormSection>
          </div>

          {/* ขวา: คำตอบของเภสัชกร */}
          <FormSection
            roleId="pharmacist"
            number={2}
            title={`คำตอบของเภสัชกร (${PHARMACY_MAX_SCORE} คะแนน)`}
            description={`เลือกความผิดปกติของฮอร์โมน (A-U) และยา/การรักษา (ก-ธ) ตามใบงาน · ถูก 1 ข้อ = 2 คะแนน, ถูกทั้ง 2 ข้อ = ${PHARMACY_MAX_SCORE} คะแนน`}
            done={!!hormoneChoiceKey && !!treatmentChoiceKey}
          >
            <div className="space-y-4">
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

              {choicesUnavailable ? (
                <Hint tone="warning">
                  ยังไม่มีตัวเลือก A-U / ก-ธ ในระบบ ให้คุณครูกรอกเฉลยของแต่ละโรคที่หน้าจัดการข้อมูลโรคก่อน
                </Hint>
              ) : (
                !selectedDiagnosisId && <Hint>เลือกผู้ป่วยในส่วนที่ 1 ก่อน จึงจะตอบตัวเลือกได้</Hint>
              )}
            </div>
          </FormSection>
        </div>

        <ActionBar
          roleId="pharmacist"
          saving={saveState.status === "saving"}
          disabled={!selectedDiagnosisId}
          hint={
            !selectedDiagnosis
              ? "เริ่มจากเลือกผู้ป่วยในส่วนที่ 1"
              : !hormoneChoiceKey || !treatmentChoiceKey
                ? "เลือกคำตอบให้ครบทั้ง A-U และ ก-ธ ในส่วนที่ 2"
                : "พร้อมบันทึกคำตอบแล้ว"
          }
          submitLabel="บันทึกคำตอบและเสร็จสิ้น"
          savingLabel="กำลังบันทึก..."
          submitIcon={Save}
          savingIcon={Pill}
          onReset={handleReset}
        />
      </form>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs font-medium text-slate-400">
        <Pill className="h-3.5 w-3.5" />
        เภสัชกร: {pharmacist.name}
      </p>
    </div>
  );
}
