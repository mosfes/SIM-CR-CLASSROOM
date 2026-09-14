"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  IdCard,
  RotateCcw,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { playClick, playSuccess } from "@/lib/play/sound";

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

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-bold text-slate-700">
      {children}
      <span className="ml-1 text-rose-500" aria-hidden="true">*</span>
    </span>
  );
}

export function PatientCardForm({ clerk, classroom, group, simulationId, diseases = [] }: PatientCardFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  // Searchable disease dropdown state
  const [selectedDiseaseCode, setSelectedDiseaseCode] = useState("");
  const [searchDiseaseTerm, setSearchDiseaseTerm] = useState("");
  const [isDiseaseDropdownOpen, setIsDiseaseDropdownOpen] = useState(false);
  const diseaseDropdownRef = useRef<HTMLDivElement>(null);

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
    const uniqueDiseases: DiseaseOption[] = [];
    const seenCodes = new Set<string>();
    for (const d of diseases) {
      if (!seenCodes.has(d.code)) {
        seenCodes.add(d.code);
        uniqueDiseases.push(d);
      }
    }
    if (!searchDiseaseTerm.trim()) return uniqueDiseases;
    const q = searchDiseaseTerm.toLowerCase().trim();
    return uniqueDiseases.filter((d) => d.code.toLowerCase().includes(q));
  }, [diseases, searchDiseaseTerm]);

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
      patientPrefix: formData.get("patientPrefix"),
      patientFirstName: formData.get("patientFirstName"),
      patientLastName: formData.get("patientLastName"),
      age: formData.get("age"),
      gender: formData.get("gender"),
      maritalStatus: formData.get("maritalStatus"),
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
      formRef.current?.reset();
      setSelectedDiseaseCode("");
      setSearchDiseaseTerm("");
      setIsDiseaseDropdownOpen(false);
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
    formRef.current?.reset();
    setSelectedDiseaseCode("");
    setSearchDiseaseTerm("");
    setIsDiseaseDropdownOpen(false);
    setSaveState({ status: "idle" });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl shadow-amber-950/5">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <IdCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-100">สถานีห้องบัตร</p>
              <h2 className="text-2xl font-bold">ออกบัตรผู้ป่วย</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-amber-100 bg-amber-50/70 px-5 py-4 text-sm sm:grid-cols-3 sm:px-7">
          <div><span className="block text-xs font-bold text-slate-400">เจ้าหน้าที่ห้องบัตร</span><span className="font-bold text-slate-800">{clerk.name}</span></div>
          <div><span className="block text-xs font-bold text-slate-400">ห้องเรียน</span><span className="font-bold text-slate-800">{classroom.name}</span></div>
          <div><span className="block text-xs font-bold text-slate-400">ห้องตรวจ</span><span className="font-bold text-slate-800">{group.name}</span></div>
        </div>
      </section>

      <div aria-live="polite">
        {saveState.status === "success" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">ออกบัตรให้ {saveState.patientName} เรียบร้อยแล้ว</p>
              <p className="mt-0.5 text-sm font-medium text-emerald-700">คิวที่ {saveState.queueNumber ?? saveState.recordId.slice(-8)} ถูกส่งต่อให้สถานีพยาบาล</p>
            </div>
          </div>
        )}
        {saveState.status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div><p className="font-bold">ยังออกบัตรไม่ได้</p><p className="mt-0.5 text-sm font-medium text-rose-700">{saveState.message}</p></div>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" aria-label="แบบฟอร์มออกบัตรผู้ป่วย">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><UserRound className="h-5 w-5" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">ข้อมูลประจำตัวผู้ป่วย</h3><p className="mt-0.5 text-sm font-medium text-slate-500">ข้อมูลชุดนี้จะถูกส่งไปให้พยาบาลโดยอัตโนมัติ</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <label className="lg:col-span-2">
              <FieldLabel>คำนำหน้า</FieldLabel>
              <select name="patientPrefix" required defaultValue="" className={fieldClass}>
                <option value="" disabled>เลือก</option>
                <option>นาย</option><option>นาง</option><option>นางสาว</option><option>เด็กชาย</option><option>เด็กหญิง</option><option>อื่น ๆ</option>
              </select>
            </label>
            <label className="lg:col-span-4"><FieldLabel>ชื่อ</FieldLabel><input name="patientFirstName" required maxLength={191} autoComplete="given-name" className={fieldClass} placeholder="ชื่อผู้ป่วย" /></label>
            <label className="lg:col-span-4"><FieldLabel>นามสกุล</FieldLabel><input name="patientLastName" required maxLength={191} autoComplete="family-name" className={fieldClass} placeholder="นามสกุลผู้ป่วย" /></label>
            <label className="lg:col-span-2">
              <FieldLabel>อายุ</FieldLabel>
              <div className="relative"><input name="age" type="number" required min="0" max="130" inputMode="numeric" className={`${fieldClass} pr-10`} placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 translate-y-[-30%] text-sm font-bold text-slate-400">ปี</span></div>
            </label>
            <label className="lg:col-span-4">
              <FieldLabel>เพศ</FieldLabel>
              <select name="gender" required defaultValue="" className={fieldClass}>
                <option value="" disabled>เลือก</option>
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="ไม่ระบุ">ไม่ระบุ</option>
              </select>
            </label>
            <label className="lg:col-span-4">
              <FieldLabel>สถานภาพ</FieldLabel>
              <select name="maritalStatus" required defaultValue="" className={fieldClass}>
                <option value="" disabled>เลือก</option>
                <option value="โสด">โสด</option>
                <option value="คู่">คู่</option>
                <option value="หม้าย">หม้าย</option>
                <option value="หย่าร้าง">หย่าร้าง</option>
                <option value="แยกกันอยู่">แยกกันอยู่</option>
              </select>
            </label>
            <div className="lg:col-span-4" ref={diseaseDropdownRef}>
              <FieldLabel>รหัสโรค</FieldLabel>
              <div className="relative mt-1.5">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchDiseaseTerm}
                    onChange={(e) => {
                      setSearchDiseaseTerm(e.target.value);
                      setSelectedDiseaseCode("");
                      setIsDiseaseDropdownOpen(true);
                    }}
                    onFocus={() => setIsDiseaseDropdownOpen(true)}
                    placeholder="ค้นหารหัสโรค..."
                    className={`${fieldClass} !mt-0 pl-9.5 pr-8 font-mono`}
                    autoComplete="off"
                  />
                  {searchDiseaseTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDiseaseTerm("");
                        setSelectedDiseaseCode("");
                        setIsDiseaseDropdownOpen(false);
                      }}
                      className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                      title="ล้างข้อมูล"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Hidden input to ensure value is in form data */}
                <input type="hidden" name="diseaseCode" value={selectedDiseaseCode} />

                {/* Searchable Dropdown Popup */}
                {isDiseaseDropdownOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-amber-200 bg-white p-1.5 shadow-xl">
                    {filteredDiseases.length > 0 ? (
                      <div className="space-y-0.5">
                        {filteredDiseases.map((disease) => {
                          const isSelected = selectedDiseaseCode === disease.code;
                          return (
                            <button
                              key={disease.id}
                              type="button"
                              onClick={() => {
                                setSelectedDiseaseCode(disease.code);
                                setSearchDiseaseTerm(disease.code);
                                setIsDiseaseDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-amber-100/80 text-amber-950 font-bold"
                                  : "text-slate-700 hover:bg-amber-50"
                              }`}
                            >
                              <span className="rounded-md bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-900 border border-amber-500/20">
                                {disease.code}
                              </span>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-700" />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {searchDiseaseTerm.trim() ? (
                          <div className="space-y-2">
                            <p>ไม่พบรหัสโรคที่ตรงกับ &ldquo;{searchDiseaseTerm}&rdquo;</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDiseaseCode(searchDiseaseTerm.trim());
                                setIsDiseaseDropdownOpen(false);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                            >
                              ใช้ &ldquo;{searchDiseaseTerm.trim()}&rdquo; เป็นรหัสโรค
                            </button>
                          </div>
                        ) : (
                          <p>ไม่มีข้อมูลโรคในระบบ</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedDiseaseCode && (
                <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  เลือกรหัสโรค: <span className="font-mono font-bold">{selectedDiseaseCode}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Reserve space so the sticky action bar below never overlaps this content */}
        <div aria-hidden="true" className="h-36 sm:h-20" />

        <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:justify-end">
          <button type="button" onClick={handleReset} disabled={saveState.status === "saving"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"><RotateCcw className="h-4 w-4" />ล้างข้อมูล</button>
          <button type="submit" disabled={saveState.status === "saving"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-amber-800 border-b-4 bg-amber-500 px-7 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60">
            {saveState.status === "saving" ? <><CreditCard className="h-4 w-4 animate-pulse" />กำลังออกบัตร...</> : <><Save className="h-4 w-4" />ออกบัตรและส่งต่อ</>}
          </button>
        </div>
      </form>
    </div>
  );
}
