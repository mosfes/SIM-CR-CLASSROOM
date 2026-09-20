"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FlaskConical, HeartPulse, Search, Send, Save, X } from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { playClick, playSuccess } from "@/lib/play/sound";
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
import { STICKY_COLUMN, ROLE_THEME, inputClass, textareaClass } from "@/components/play/kit/theme";

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
  endocrineGlandChoice?: string | null;
  abnormalHormoneChoice?: string | null;
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

export function MedTechLabForm({
  medTech,
  classroom,
  group,
  simulationId,
  initialLabQueue,
  labPanels,
}: MedTechLabFormProps) {
  const theme = ROLE_THEME.medtech;
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

  function selectPanel(panelId: string) {
    playClick();
    setSelectedPanelId(panelId);
    setSaveState({ status: "idle" });
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

  const hintText = !selectedInterview
    ? "เริ่มจากเลือกผู้ป่วยในส่วนที่ 1"
    : !selectedPanel
      ? "อ่านอาการ แล้วเลือกชุดผลตรวจที่สอดคล้องในส่วนที่ 2"
      : `พร้อมส่ง: ${selectedPanel.label} (${selectedPanel.items.length} รายการ)`;

  return (
    <div className="space-y-4">
      <StationHero
        roleId="medtech"
        title="ส่งผลตรวจทางห้องปฏิบัติการ"
        description="อ่านข้อมูลที่พยาบาลซักมา แล้วเลือกชุดผลตรวจที่สอดคล้องกับอาการผู้ป่วยเพื่อส่งให้แพทย์"
      />

      <div aria-live="polite" className="space-y-3">
        {saveState.status === "success" && (
          <SuccessBanner
            roleId="medtech"
            title={`ส่งผลตรวจของ ${saveState.patientName} เรียบร้อยแล้ว`}
            queueNumber={saveState.queueNumber}
            fallbackCode={saveState.recordId.slice(-4)}
            detail={`${saveState.itemCount} รายการ · รับผู้ป่วยรายถัดไปได้เลย`}
          />
        )}
        {saveState.status === "error" && <ErrorBanner title="ยังส่งผลตรวจไม่ได้" message={saveState.message} />}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-label="แบบฟอร์มส่งผลตรวจของเทคนิคการแพทย์">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          {/* ซ้าย: ผู้ป่วยและข้อมูลจากพยาบาล (ค้างอยู่ขณะเลือกชุดตรวจ) */}
          <div className={STICKY_COLUMN}>
            <FormSection
              roleId="medtech"
              number={1}
              title="ผู้ป่วยและข้อมูลจากพยาบาล"
              description="เลือกผู้ป่วย แล้วอ่านสัญญาณชีพและอาการที่พยาบาลซักมา"
              done={!!selectedInterview}
            >
              <QueuePicker
                roleId="medtech"
                label="ผู้ป่วยที่รอผลตรวจ"
                items={interviews.map((item) => ({
                  id: item.id,
                  queueNumber: item.queueNumber,
                  name: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`,
                  meta: `${item.age} ปี · ${item.gender}`,
                }))}
                selectedId={selectedInterviewId}
                onSelect={(id) => {
                  setSelectedInterviewId(id);
                  setSaveState({ status: "idle" });
                }}
                onRefresh={refreshQueue}
                refreshing={refreshing}
                emptyText="ยังไม่มีผู้ป่วยที่ส่งมาจากห้องพยาบาล ให้สถานีพยาบาลซักประวัติก่อน แล้วกดรีเฟรช"
              />

              {selectedInterview && (
                <div className="mt-4 space-y-3">
                  <PatientIdentity
                    roleId="medtech"
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
                </div>
              )}
            </FormSection>
          </div>

          {/* ขวา: เลือกชุดผลตรวจ */}
          <FormSection
            roleId="medtech"
            number={2}
            title="เลือกชุดผลตรวจที่จะส่งให้แพทย์"
            description="อ่านค่าผลตรวจในแต่ละชุด แล้วกดเลือกชุดที่สอดคล้องกับอาการของผู้ป่วย"
            done={!!selectedPanel}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchPanelTerm}
                    onChange={(event) => setSearchPanelTerm(event.target.value)}
                    placeholder="ค้นหารายการตรวจหรือค่าผล เช่น IGF-1, TSH, Cortisol"
                    aria-label="ค้นหาชุดผลตรวจ"
                    className={`${inputClass("medtech")} pl-10 pr-10`}
                    autoComplete="off"
                    disabled={numberedPanels.length === 0}
                  />
                  {searchPanelTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchPanelTerm("")}
                      title="ล้างคำค้นหา"
                      aria-label="ล้างคำค้นหา"
                      className="absolute right-2.5 top-1/2 mt-[3px] flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <span className={`mt-1.5 shrink-0 self-start rounded-xl border px-3 py-3 text-xs font-black sm:self-auto ${theme.soft}`}>
                  {filteredPanels.length} / {numberedPanels.length} ชุด
                </span>
              </div>

              <input type="hidden" name="panelDiseaseId" value={selectedPanelId} />

              {numberedPanels.length === 0 ? (
                <Hint tone="warning">ยังไม่มีชุดผลตรวจในระบบ ให้คุณครูเพิ่มผลตรวจในหน้าจัดการโรคก่อน</Hint>
              ) : filteredPanels.length === 0 ? (
                <Hint>ไม่พบชุดตรวจที่มีรายการตรงกับ &ldquo;{searchPanelTerm}&rdquo;</Hint>
              ) : (
                <div role="radiogroup" aria-label="ชุดผลตรวจทางห้องปฏิบัติการ" className="grid gap-3">
                  {filteredPanels.map((panel) => {
                    const isSelected = selectedPanelId === panel.id;
                    return (
                      <div
                        key={panel.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => selectPanel(panel.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectPanel(panel.id);
                          }
                        }}
                        className={`cursor-pointer overflow-hidden rounded-2xl border bg-white outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-100 ${
                          isSelected ? theme.chosen : theme.choice
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${
                            isSelected ? "border-indigo-100 bg-indigo-50" : "border-slate-100 bg-slate-50/80"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 text-sm font-black text-slate-800">
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
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                            {panel.items.length} รายการ
                          </span>
                        </div>
                        <LabResultTable items={panel.items} />
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPanel && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ชุดผลตรวจที่เลือก: {selectedPanel.label} ({selectedPanel.items.length} รายการ)
                </p>
              )}

              <label className="block">
                <FieldLabel>หมายเหตุถึงแพทย์ (ถ้ามี)</FieldLabel>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={5000}
                  className={textareaClass("medtech")}
                  placeholder="เช่น ค่าที่ผิดปกติที่ควรสังเกต หรือข้อจำกัดของสิ่งส่งตรวจ..."
                />
              </label>
            </div>
          </FormSection>
        </div>

        <ActionBar
          roleId="medtech"
          saving={saveState.status === "saving"}
          disabled={!selectedInterviewId || !selectedPanelId}
          hint={hintText}
          submitLabel="ส่งผลตรวจให้แพทย์"
          savingLabel="กำลังส่งผลตรวจ..."
          submitIcon={Save}
          savingIcon={Send}
          onReset={handleReset}
        />
      </form>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs font-medium text-slate-400">
        <FlaskConical className="h-3.5 w-3.5" />
        นักเทคนิคการแพทย์: {medTech.name}
      </p>
    </div>
  );
}
