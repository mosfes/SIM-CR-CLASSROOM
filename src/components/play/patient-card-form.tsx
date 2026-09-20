"use client";

import { useMemo, useRef, useState } from "react";
import { CreditCard, Save, Stethoscope, UserRound } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { playClick, playSuccess } from "@/lib/play/sound";
import { SearchCombo } from "@/components/play/kit/search-combo";
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
import { inputClass } from "@/components/play/kit/theme";

export interface DiseaseOption {
  id: string;
  code: string;
  name: string;
}

interface PatientCardFormProps {
  clerk: { id: string; name: string; studentId: string | null };
  classroom: { id: string; name: string };
  group: { id: string; name: string };
  simulationId: string;
  diseases?: DiseaseOption[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; recordId: string; queueNumber?: number | null; patientName: string }
  | { status: "error"; message: string };

const PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง", "อื่น ๆ"].map((value) => ({ value, label: value }));
const GENDER_OPTIONS = ["ชาย", "หญิง", "ไม่ระบุ"].map((value) => ({ value, label: value }));
const MARITAL_OPTIONS = ["โสด", "คู่", "หม้าย", "หย่าร้าง", "แยกกันอยู่"].map((value) => ({ value, label: value }));

export function PatientCardForm({ clerk, classroom, group, simulationId, diseases = [] }: PatientCardFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [patientPrefix, setPatientPrefix] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [selectedDiseaseCode, setSelectedDiseaseCode] = useState("");
  // เปลี่ยนค่านี้เพื่อล้างข้อความค้นหาในช่องรหัสโรค
  const [comboKey, setComboKey] = useState(0);

  const diseaseOptions = useMemo(() => {
    const seenCodes = new Set<string>();
    const options: Array<{ id: string; label: string }> = [];
    for (const disease of diseases) {
      if (seenCodes.has(disease.code)) continue;
      seenCodes.add(disease.code);
      options.push({ id: disease.code, label: disease.code });
    }
    return options;
  }, [diseases]);

  function clearForm() {
    formRef.current?.reset();
    setPatientPrefix("");
    setGender("");
    setMaritalStatus("");
    setSelectedDiseaseCode("");
    setComboKey((key) => key + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const diseaseCode = selectedDiseaseCode || (formData.get("diseaseCode") as string)?.trim();

    if (!diseaseCode) {
      setSaveState({ status: "error", message: "กรุณาเลือกรหัสโรค" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaveState({ status: "saving" });

    const payload = {
      clerkId: clerk.id,
      classroomId: classroom.id,
      groupId: group.id,
      simulationId,
      patientPrefix,
      patientFirstName: formData.get("patientFirstName"),
      patientLastName: formData.get("patientLastName"),
      age: formData.get("age"),
      gender,
      maritalStatus,
      diseaseCode,
    };

    try {
      const response = await fetch("/api/play/patient-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถออกบัตรผู้ป่วยได้");
      }

      playSuccess();
      clearForm();
      setSaveState({
        status: "success",
        recordId: result.data.id,
        queueNumber: result.data.queueNumber,
        patientName: `${result.data.patientPrefix}${result.data.patientFirstName} ${result.data.patientLastName}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการออกบัตรผู้ป่วย",
      });
    }
  }

  function handleReset() {
    playClick();
    clearForm();
    setSaveState({ status: "idle" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <StationHero
        roleId="card-room"
        title="ออกบัตรผู้ป่วย"
        description="สร้างผู้ป่วยใหม่: กรอกข้อมูลประจำตัวและเลือกรหัสโรค ระบบจะออกรหัสผู้ป่วยแล้วส่งต่อให้พยาบาลอัตโนมัติ"
      />

      <div aria-live="polite" className="space-y-3">
        {saveState.status === "success" && (
          <SuccessBanner
            roleId="card-room"
            title={`ออกบัตรให้ ${saveState.patientName} เรียบร้อยแล้ว`}
            queueNumber={saveState.queueNumber}
            fallbackCode={saveState.recordId.slice(-4)}
            detail="ออกบัตรผู้ป่วยรายถัดไปได้เลย"
          />
        )}
        {saveState.status === "error" && <ErrorBanner title="ยังออกบัตรไม่ได้" message={saveState.message} />}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-label="แบบฟอร์มออกบัตรผู้ป่วย">
        <FormSection
          roleId="card-room"
          number={1}
          title="ข้อมูลประจำตัวผู้ป่วย"
          description="ชื่อ อายุ เพศ และสถานภาพของผู้ป่วยที่จะออกบัตร"
        >
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <AppSelect
                isRequired
                fullWidth
                tone="amber"
                name="patientPrefix"
                label="คำนำหน้า"
                placeholder="เลือก"
                options={PREFIX_OPTIONS}
                value={patientPrefix}
                onChange={setPatientPrefix}
              />
            </div>
            <label className="block sm:col-span-2">
              <FieldLabel required>ชื่อ</FieldLabel>
              <input
                name="patientFirstName"
                required
                maxLength={191}
                autoComplete="given-name"
                className={inputClass("card-room")}
                placeholder="ชื่อผู้ป่วย"
              />
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel required>นามสกุล</FieldLabel>
              <input
                name="patientLastName"
                required
                maxLength={191}
                autoComplete="family-name"
                className={inputClass("card-room")}
                placeholder="นามสกุลผู้ป่วย"
              />
            </label>
            <div className="sm:col-span-2">
              <UnitInput
                roleId="card-room"
                label="อายุ"
                unit="ปี"
                name="age"
                type="number"
                required
                min="0"
                max="130"
                inputMode="numeric"
                placeholder="0"
              />
            </div>
            <div className="sm:col-span-2">
              <AppSelect
                isRequired
                fullWidth
                tone="amber"
                name="gender"
                label="เพศ"
                placeholder="เลือก"
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
              />
            </div>
            <div className="sm:col-span-2">
              <AppSelect
                isRequired
                fullWidth
                tone="amber"
                name="maritalStatus"
                label="สถานภาพ"
                placeholder="เลือก"
                options={MARITAL_OPTIONS}
                value={maritalStatus}
                onChange={setMaritalStatus}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          roleId="card-room"
          number={2}
          title="รหัสโรคของผู้ป่วย"
          description="พิมพ์ค้นหาแล้วเลือกรหัสโรค ระบบจะดึงอาการของโรคนี้ไปให้พยาบาลโดยอัตโนมัติ"
          done={!!selectedDiseaseCode}
        >
          <div className="max-w-md">
            <SearchCombo
              key={comboKey}
              roleId="card-room"
              label="รหัสโรค"
              required
              mono
              placeholder="ค้นหารหัสโรค..."
              options={diseaseOptions}
              value={selectedDiseaseCode}
              onChange={setSelectedDiseaseCode}
              emptyText="ไม่มีข้อมูลโรคในระบบ"
            />
            <input type="hidden" name="diseaseCode" value={selectedDiseaseCode} />
          </div>
          {diseaseOptions.length === 0 && (
            <div className="mt-3">
              <Hint tone="warning" icon={Stethoscope}>
                ยังไม่มีข้อมูลโรคในระบบ ให้คุณครูเพิ่มโรคที่หน้าจัดการโรคก่อน
              </Hint>
            </div>
          )}
        </FormSection>

        <ActionBar
          roleId="card-room"
          saving={saveState.status === "saving"}
          hint="กรอกให้ครบทุกช่องที่มี * แล้วกดออกบัตร"
          submitLabel="ออกบัตรและส่งต่อ"
          savingLabel="กำลังออกบัตร..."
          submitIcon={Save}
          savingIcon={CreditCard}
          onReset={handleReset}
        />
      </form>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs font-medium text-slate-400">
        <UserRound className="h-3.5 w-3.5" />
        ผู้ออกบัตร: {clerk.name}
      </p>
    </div>
  );
}
