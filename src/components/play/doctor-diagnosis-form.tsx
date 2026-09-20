"use client";

import { useMemo, useRef, useState } from "react";
import { FileText, FlaskConical, HeartPulse, Save, Stethoscope } from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { playClick, playSuccess } from "@/lib/play/sound";
import { SearchCombo } from "@/components/play/kit/search-combo";
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
  FieldLabel,
  FormSection,
  Hint,
  StationHero,
  SuccessBanner,
} from "@/components/play/kit/station-ui";
import { STICKY_COLUMN, textareaClass } from "@/components/play/kit/theme";

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
  endocrineGlandChoice?: string | null;
  abnormalHormoneChoice?: string | null;
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
  // เปลี่ยนค่านี้เพื่อล้างข้อความค้นหาในช่องเลือกโรค
  const [comboKey, setComboKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const diseaseOptions = useMemo(
    () => diseases.map((disease) => ({ id: disease.id, label: disease.name, sublabel: disease.code })),
    [diseases]
  );

  const selectedInterview = interviews.find((item) => item.id === selectedInterviewId);

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
      setComboKey((key) => key + 1);
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
    setComboKey((key) => key + 1);
    setSaveState({ status: "idle" });
  }

  return (
    <div className="space-y-4">
      <StationHero
        roleId="doctor"
        title="บันทึกการวินิจฉัยโรค"
        description="อ่านประวัติจากพยาบาลและผลตรวจจากเทคนิคการแพทย์ แล้ววินิจฉัยว่าผู้ป่วยเป็นโรคอะไร"
      />

      <div aria-live="polite" className="space-y-3">
        {saveState.status === "success" && (
          <SuccessBanner
            roleId="doctor"
            title={`บันทึกผลการวินิจฉัยให้ ${saveState.patientName} เรียบร้อยแล้ว`}
            queueNumber={saveState.queueNumber}
            fallbackCode={saveState.recordId.slice(-4)}
            detail="รับผู้ป่วยรายถัดไปได้เลย"
          />
        )}
        {saveState.status === "error" && (
          <ErrorBanner title="ยังบันทึกผลการวินิจฉัยไม่ได้" message={saveState.message} />
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-label="แบบฟอร์มการวินิจฉัยโรคของแพทย์">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
          {/* ซ้าย: ข้อมูลผู้ป่วยและผลตรวจ (ค้างอยู่ขณะเขียนวินิจฉัย) */}
          <div className={STICKY_COLUMN}>
            <FormSection
              roleId="doctor"
              number={1}
              title="ข้อมูลผู้ป่วยและผลตรวจ"
              description="เลือกเคสที่ผ่านการซักประวัติและมีผลแล็บแล้ว แล้วอ่านข้อมูลประกอบการวินิจฉัย"
              done={!!selectedInterview}
            >
              <QueuePicker
                roleId="doctor"
                label="ผู้ป่วยที่รอการตรวจวินิจฉัย"
                items={interviews.map((item) => ({
                  id: item.id,
                  queueNumber: item.queueNumber,
                  name: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`,
                  meta: `${item.age} ปี · ${item.gender} · ${item.maritalStatus}`,
                }))}
                selectedId={selectedInterviewId}
                onSelect={(id) => {
                  setSelectedInterviewId(id);
                  setSaveState({ status: "idle" });
                }}
                onRefresh={refreshInterviews}
                refreshing={refreshing}
                emptyText="ยังไม่มีผู้ป่วยที่มีผลแล็บพร้อมตรวจ ให้พยาบาลซักประวัติและเทคนิคการแพทย์ส่งผลแล็บก่อน แล้วกดรีเฟรช"
              />

              {selectedInterview && (
                <div className="mt-4 space-y-3">
                  <PatientIdentity
                    roleId="doctor"
                    queueNumber={selectedInterview.queueNumber}
                    name={`${selectedInterview.patientPrefix}${selectedInterview.patientFirstName} ${selectedInterview.patientLastName}`}
                    age={selectedInterview.age}
                    gender={selectedInterview.gender}
                    maritalStatus={selectedInterview.maritalStatus}
                  />

                  <InfoBlock station="nurse" icon={HeartPulse} title="สัญญาณชีพและอาการ" by={selectedInterview.nurseName}>
                    <VitalsGrid data={selectedInterview} />
                    <TextPanel label="อาการผู้ป่วย">{selectedInterview.symptomDescription}</TextPanel>
                    {selectedInterview.notes && (
                      <p className="rounded-xl border border-dashed border-emerald-200 px-3 py-2 text-xs font-medium text-slate-600">
                        <span className="font-bold text-emerald-800">หมายเหตุจากพยาบาล: </span>
                        {selectedInterview.notes}
                      </p>
                    )}
                  </InfoBlock>

                  <NurseAnalysis
                    gland={selectedInterview.endocrineGlandChoice}
                    hormone={selectedInterview.abnormalHormoneChoice}
                  />

                  {selectedInterview.labResult && (
                    <InfoBlock
                      station="medtech"
                      icon={FlaskConical}
                      title="ผลตรวจทางห้องปฏิบัติการ"
                      by={selectedInterview.labResult.medTechName}
                    >
                      <div className="-mx-3.5 -mb-3.5 border-t border-slate-100">
                        <LabResultTable items={selectedInterview.labResult.items} />
                        {selectedInterview.labResult.notes && (
                          <p className="border-t border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 text-xs font-medium text-slate-600">
                            <span className="font-bold text-indigo-800">หมายเหตุจากห้องแล็บ: </span>
                            {selectedInterview.labResult.notes}
                          </p>
                        )}
                      </div>
                    </InfoBlock>
                  )}
                </div>
              )}
            </FormSection>
          </div>

          {/* ขวา: วินิจฉัย */}
          <FormSection
            roleId="doctor"
            number={2}
            title="การวินิจฉัยโรค"
            description="บันทึกเหตุผลการวินิจฉัย แล้วเลือกโรคที่ผู้ป่วยเป็น"
            done={!!selectedDiseaseId}
          >
            <div className="space-y-4">
              <label className="block">
                <FieldLabel required>การวินิจฉัยโรคของแพทย์</FieldLabel>
                <textarea
                  name="doctorDiagnosis"
                  required
                  rows={4}
                  maxLength={5000}
                  className={textareaClass("doctor")}
                  placeholder="ระบุผลการวินิจฉัยโรค รายละเอียดการตรวจทางคลินิก หรือเหตุผลประกอบการวินิจฉัย..."
                />
              </label>

              <SearchCombo
                key={comboKey}
                roleId="doctor"
                label="เลือกโรค"
                required
                placeholder="พิมพ์ค้นหาชื่อหรือรหัสโรค..."
                options={diseaseOptions}
                value={selectedDiseaseId}
                onChange={setSelectedDiseaseId}
                emptyText="ไม่มีข้อมูลโรคในระบบ"
              />
              <input type="hidden" name="diseaseId" value={selectedDiseaseId} />

              {!selectedInterview && <Hint>เลือกผู้ป่วยในส่วนที่ 1 ก่อน แล้วอ่านข้อมูลประกอบก่อนวินิจฉัย</Hint>}
            </div>
          </FormSection>
        </div>

        <ActionBar
          roleId="doctor"
          saving={saveState.status === "saving"}
          disabled={!selectedInterviewId}
          hint={
            !selectedInterview
              ? "เริ่มจากเลือกผู้ป่วยในส่วนที่ 1"
              : !selectedDiseaseId
                ? "เขียนวินิจฉัยและเลือกโรคในส่วนที่ 2"
                : "พร้อมบันทึก — ระบบจะให้ AI ประเมินคำตอบหลังกดส่ง"
          }
          submitLabel="บันทึกการวินิจฉัยและส่งต่อ"
          savingLabel="กำลังตรวจและประเมินผลโดย AI..."
          submitIcon={Save}
          savingIcon={FileText}
          onReset={handleReset}
        />
      </form>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs font-medium text-slate-400">
        <Stethoscope className="h-3.5 w-3.5" />
        แพทย์ผู้ตรวจ: {doctor.name}
      </p>
    </div>
  );
}
