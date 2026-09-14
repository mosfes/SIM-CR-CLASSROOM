"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  Users,
  FileText,
  FlaskConical,
  Stethoscope,
  HeartPulse,
  Pill,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Activity,
  AlertCircle,
  Printer,
} from "lucide-react";
import { downloadElementAsPdf } from "@/lib/pdf-export";

interface StudentBasic {
  id: string;
  studentId: string;
  name: string;
  isActive?: boolean;
}

interface ActivityPayload {
  // Clerk
  diseaseCode?: string | null;
  doctorName?: string | null;
  doctorDisease?: string | null;
  doctorIsCorrect?: boolean | null;
  pharmacistName?: string | null;

  // Nurse
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseBpm?: number | null;
  chronicDiseaseStatus?: string | null;
  chronicDiseaseDetails?: string | null;
  chiefComplaint?: string | null;
  symptomDescription?: string | null;
  notes?: string | null;

  // Medical technologist
  panelDiseaseCode?: string | null;
  panelDiseaseName?: string | null;
  labItems?: Array<{ name: string; result: string; referenceRange: string }> | null;

  // Doctor
  diseaseName?: string | null;
  expectedDiseaseCode?: string | null;
  doctorDiagnosis?: string | null;
  treatmentPlan?: string | null;
  isCorrect?: boolean | null;
  evaluationScore?: number | null;
  aiModel?: string | null;
  aiFeedback?: string | null;
  aiStrengths?: string | null;
  aiEvaluatedAt?: string | null;

  // Pharmacist
  doctorDiagnosisText?: string | null;
  medicines?: Array<{
    name?: string;
    medicineName?: string;
    amount?: number | string;
    dosage?: string;
    unit?: string;
    instructions?: string;
    advice?: string;
  }> | null;
  totalTablets?: number | null;
}

interface ActivityItem {
  id: string;
  role: "CLERK" | "NURSE" | "MEDTECH" | "DOCTOR" | "PHARMACIST";
  roleLabel: string;
  createdAt: string;
  queueNumber: number | null;
  classroomName: string;
  groupName: string;
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    gender: string;
    maritalStatus: string;
  };
  payload: ActivityPayload;
}

interface ActivityResponseData {
  student: {
    id: string;
    studentId: string | null;
    name: string;
    isActive: boolean;
    createdAt: string;
    groupMemberships: Array<{
      classroom: {
        id: string;
        name: string;
      };
      group: {
        id: string;
        name: string;
      };
    }>;
  };
  summary: {
    totalSubmissions: number;
    clerkCount: number;
    nurseCount: number;
    medTechCount: number;
    doctorCount: number;
    pharmacistCount: number;
    medTechStats: {
      total: number;
      correct: number;
      accuracyPercent: number;
    };
    doctorStats: {
      total: number;
      correct: number;
      accuracyPercent: number;
      avgScore: number | null;
    };
    pharmacistStats: {
      total: number;
      totalTablets: number;
    };
  };
  activities: ActivityItem[];
}

interface StudentActivityModalProps {
  student: StudentBasic | null;
  onClose: () => void;
}

export function StudentActivityModal({ student, onClose }: StudentActivityModalProps) {
  const [data, setData] = useState<ActivityResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "CLERK" | "NURSE" | "MEDTECH" | "DOCTOR" | "PHARMACIST"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const studentId = student?.id;

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshIndex((idx) => idx + 1);
  }, []);

  // ส่งออกประวัติกิจกรรมของนักเรียนเป็นไฟล์ PDF ดาวน์โหลดลงเครื่อง
  const handleExportPdf = async () => {
    const panel = document.getElementById("printable-student-activity");
    if (!panel || !student || exportingPdf) return;

    try {
      setExportingPdf(true);
      setExportError(null);
      const today = new Date().toISOString().slice(0, 10);
      await downloadElementAsPdf(panel, `กิจกรรมนักเรียน-${student.name}-${today}.pdf`);
    } catch (error) {
      console.error("Failed to export student activity PDF:", error);
      setExportError(
        error instanceof Error ? error.message : "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!studentId) {
      return;
    }

    fetch(`/api/admin/students/${studentId}/activity`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (!json.success) {
          throw new Error(json.error || "ไม่สามารถโหลดข้อมูลประวัติได้");
        }
        setData(json.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [studentId, refreshIndex]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activities = data?.activities ?? [];
  const filteredActivities = activities.filter((item) => {
    // Role filter
    if (roleFilter !== "ALL" && item.role !== roleFilter) {
      return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchPatient = item.patient.fullName.toLowerCase().includes(q);
      const matchQueue = item.queueNumber !== null && String(item.queueNumber).includes(q);
      const matchClass = item.classroomName.toLowerCase().includes(q);
      const matchGroup = item.groupName.toLowerCase().includes(q);
      const matchDisease = (item.payload.diseaseName || "").toLowerCase().includes(q);
      const matchDiseaseCode = (item.payload.diseaseCode || "").toLowerCase().includes(q);
      const matchDiagnosis = (item.payload.doctorDiagnosis || "").toLowerCase().includes(q);
      const matchComplaint = (item.payload.chiefComplaint || "").toLowerCase().includes(q);
      return (
        matchPatient ||
        matchQueue ||
        matchClass ||
        matchGroup ||
        matchDisease ||
        matchDiseaseCode ||
        matchDiagnosis ||
        matchComplaint
      );
    }
    return true;
  });

  if (!student) return null;

  const initials = student.name
    ? student.name.replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)/, "").trim().slice(0, 2)
    : "นร";

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div id="printable-student-activity" className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header Card */}
        <div className="bg-white border-b border-slate-200 p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-medium text-lg shadow-md shadow-rose-500/20">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    {student.name}
                  </h2>
                  {student.isActive !== false ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      เปิดใช้งาน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      ปิดใช้งาน
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    รหัส {student.studentId}
                  </span>
                  {data?.student.groupMemberships && data.student.groupMemberships.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-slate-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md font-medium">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      {data.student.groupMemberships.map((m) => `${m.classroom.name} • ${m.group.name}`).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div data-pdf-ignore className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                title="รีเฟรชข้อมูล"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 5 Role Summary KPI Cards */}
          {data?.summary && (
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
              {/* Clerk Card */}
              <button
                type="button"
                onClick={() => setRoleFilter(roleFilter === "CLERK" ? "ALL" : "CLERK")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  roleFilter === "CLERK"
                    ? "bg-sky-50 border-sky-400 ring-2 ring-sky-400/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">ห้องบัตร</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {data.summary.clerkCount}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">เคส</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">ออกบัตรและระบุรหัสโรค</p>
              </button>

              {/* Nurse Card */}
              <button
                type="button"
                onClick={() => setRoleFilter(roleFilter === "NURSE" ? "ALL" : "NURSE")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  roleFilter === "NURSE"
                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">พยาบาล</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {data.summary.nurseCount}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">เคส</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">ซักประวัติและวัดสัญญาณชีพ</p>
              </button>

              {/* Medical Technologist Card */}
              <button
                type="button"
                onClick={() => setRoleFilter(roleFilter === "MEDTECH" ? "ALL" : "MEDTECH")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  roleFilter === "MEDTECH"
                    ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">เทคนิคการแพทย์</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <FlaskConical className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {data.summary.medTechCount}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">เคส</span>
                  {data.summary.medTechStats.total > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                      ตรง {data.summary.medTechStats.correct}/{data.summary.medTechStats.total} ({data.summary.medTechStats.accuracyPercent}%)
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">เลือกชุดผลตรวจส่งให้แพทย์</p>
              </button>

              {/* Doctor Card */}
              <button
                type="button"
                onClick={() => setRoleFilter(roleFilter === "DOCTOR" ? "ALL" : "DOCTOR")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  roleFilter === "DOCTOR"
                    ? "bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">แพทย์</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {data.summary.doctorCount}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">เคส</span>
                  {data.summary.doctorStats.total > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                      ถูก {data.summary.doctorStats.correct}/{data.summary.doctorStats.total} ({data.summary.doctorStats.accuracyPercent}%)
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {data.summary.doctorStats.avgScore !== null
                    ? `คะแนน AI เฉลี่ย: ${data.summary.doctorStats.avgScore} / 10`
                    : "ตรวจวินิจฉัยและสั่งการรักษา"}
                </p>
              </button>

              {/* Pharmacist Card */}
              <button
                type="button"
                onClick={() => setRoleFilter(roleFilter === "PHARMACIST" ? "ALL" : "PHARMACIST")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  roleFilter === "PHARMACIST"
                    ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">เภสัชกร</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Pill className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {data.summary.pharmacistCount}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">เคส</span>
                  {data.summary.pharmacistStats.totalTablets > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                      {data.summary.pharmacistStats.totalTablets} เม็ด
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">จัดและจ่ายยาตามใบสั่งแพทย์</p>
              </button>
            </div>
          )}
        </div>

        {/* Toolbar: Filter Tabs + Search */}
        <div data-pdf-ignore className="bg-slate-100/70 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              ทั้งหมด ({data?.summary.totalSubmissions || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("CLERK")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "CLERK"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              ห้องบัตร ({data?.summary.clerkCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("NURSE")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "NURSE"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              พยาบาล ({data?.summary.nurseCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("MEDTECH")}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                roleFilter === "MEDTECH"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              เทคนิคการแพทย์ ({data?.summary.medTechCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("DOCTOR")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "DOCTOR"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              แพทย์ ({data?.summary.doctorCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("PHARMACIST")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === "PHARMACIST"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              เภสัชกร ({data?.summary.pharmacistCount || 0})
            </button>
          </div>

          {/* Search box within student's submissions */}
          <div className="relative min-w-[220px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคนไข้, เลขคิว, โรค..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Submissions Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-28 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-20 bg-slate-200 rounded-md" />
                  </div>
                  <div className="h-4 w-48 bg-slate-200 rounded-md" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">เกิดข้อผิดพลาด</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-3">
                <Activity className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                {data?.summary.totalSubmissions === 0
                  ? "ยังไม่มีประวัติการส่งข้อมูล"
                  : "ไม่พบข้อมูลที่ตรงกับเงื่อนไขตัวกรอง"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {data?.summary.totalSubmissions === 0
                  ? "นักเรียนยังไม่ได้เข้าร่วมเล่นหรือส่งข้อมูลในบทบาทใด"
                  : searchQuery
                  ? `ไม่พบประวัติที่ตรงกับคำค้นหา "${searchQuery}"`
                  : "ไม่มีรายการส่งในตำแหน่งที่เลือก"}
              </p>
              {(roleFilter !== "ALL" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  แสดงทั้งหมด
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((act) => {
                const isClerk = act.role === "CLERK";
                const isNurse = act.role === "NURSE";
                const isMedTech = act.role === "MEDTECH";
                const isDoctor = act.role === "DOCTOR";
                const isPharmacist = act.role === "PHARMACIST";

                const roleBadgeColor = isClerk
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : isNurse
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isMedTech
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : isDoctor
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-amber-50 text-amber-800 border-amber-200";

                const RoleIcon = isClerk
                  ? FileText
                  : isNurse
                  ? Stethoscope
                  : isMedTech
                  ? FlaskConical
                  : isDoctor
                  ? HeartPulse
                  : Pill;

                return (
                  <div
                    key={act.id}
                    data-pdf-block
                    className="rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${roleBadgeColor}`}>
                          <RoleIcon className="h-3.5 w-3.5" />
                          <span>{act.roleLabel}</span>
                        </span>

                        {act.queueNumber !== null && (
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">
                            คิว #{act.queueNumber}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 font-medium">
                          {act.classroomName} • {act.groupName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDate(act.createdAt)}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Patient Info Row */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-900">
                          คนไข้: {act.patient.fullName}
                        </span>
                        <span>อายุ: <strong className="text-slate-800">{act.patient.age}</strong> ปี</span>
                        <span>เพศ: <strong className="text-slate-800">{act.patient.gender}</strong></span>
                        <span>สถานภาพ: <strong className="text-slate-800">{act.patient.maritalStatus}</strong></span>
                      </div>

                      {/* Role Payload: CLERK */}
                      {isClerk && (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">รหัสโรคที่กำหนด (เฉลย):</span>
                            <span className="font-mono text-xs font-bold text-slate-800 bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md">
                              {act.payload.diseaseCode || "ไม่ระบุ"}
                            </span>
                          </div>

                          {(act.payload.doctorName || act.payload.pharmacistName) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              {act.payload.doctorName && (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                                  <span className="text-slate-500 block text-[11px]">แพทย์ผู้ตรวจ:</span>
                                  <span className="font-medium text-slate-800">{act.payload.doctorName}</span>
                                  {act.payload.doctorDisease && (
                                    <span className="block text-slate-600 mt-0.5">
                                      วินิจฉัย: {act.payload.doctorDisease}
                                      {act.payload.doctorIsCorrect === true ? (
                                        <span className="ml-1.5 text-emerald-600 font-semibold">(ตรงเฉลย)</span>
                                      ) : act.payload.doctorIsCorrect === false ? (
                                        <span className="ml-1.5 text-red-600 font-semibold">(ไม่ตรงเฉลย)</span>
                                      ) : null}
                                    </span>
                                  )}
                                </div>
                              )}
                              {act.payload.pharmacistName && (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                                  <span className="text-slate-500 block text-[11px]">เภสัชกรผู้จ่ายยา:</span>
                                  <span className="font-medium text-slate-800">{act.payload.pharmacistName}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Role Payload: NURSE */}
                      {isNurse && (
                        <div className="space-y-3">
                          {/* Vital Signs Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-center">
                              <span className="text-[10px] text-emerald-700 block">ความดันโลหิต (BP)</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {act.payload.systolicBp}/{act.payload.diastolicBp}
                              </span>
                              <span className="text-[10px] text-slate-400 block">mmHg</span>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-center">
                              <span className="text-[10px] text-emerald-700 block">ชีพจร (Pulse)</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {act.payload.pulseBpm}
                              </span>
                              <span className="text-[10px] text-slate-400 block">bpm</span>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-center">
                              <span className="text-[10px] text-emerald-700 block">น้ำหนัก / ส่วนสูง</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {act.payload.weightKg} kg / {act.payload.heightCm} cm
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                BMI: {act.payload.bmi ?? "-"}
                              </span>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-center">
                              <span className="text-[10px] text-emerald-700 block">โรคประจำตัว</span>
                              <span className="font-medium text-slate-800 text-xs block truncate" title={act.payload.chronicDiseaseDetails || act.payload.chronicDiseaseStatus || "ไม่มี"}>
                                {act.payload.chronicDiseaseStatus || "ไม่มี"}
                              </span>
                              {act.payload.chronicDiseaseDetails && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {act.payload.chronicDiseaseDetails}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Chief Complaint & Symptoms */}
                          <div className="space-y-2 text-xs">
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                                อาการสำคัญที่มาโรงพยาบาล (Chief Complaint):
                              </span>
                              <p className="text-slate-700 leading-relaxed">
                                {act.payload.chiefComplaint || "-"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                                รายละเอียดอาการและการซักประวัติเพิ่มเติม:
                              </span>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                {act.payload.symptomDescription || "-"}
                              </p>
                            </div>

                            {act.payload.notes && (
                              <div className="rounded-xl bg-amber-50/60 border border-amber-200/60 p-2.5">
                                <span className="font-semibold text-amber-900 block text-[11px]">
                                  บันทึกเพิ่มเติมของพยาบาล:
                                </span>
                                <p className="text-amber-800 text-xs mt-0.5">{act.payload.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Role Payload: MEDTECH */}
                      {isMedTech && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">ชุดผลตรวจที่ส่ง:</span>
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800">
                              {act.payload.panelDiseaseName || "ไม่ระบุ"}
                              {act.payload.panelDiseaseCode ? ` (${act.payload.panelDiseaseCode})` : ""}
                            </span>
                            {act.payload.isCorrect === true ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> ตรงเฉลย
                              </span>
                            ) : act.payload.isCorrect === false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                                <XCircle className="h-3.5 w-3.5" /> ไม่ตรงเฉลย
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">ไม่มีเฉลยรหัสโรค</span>
                            )}
                          </div>

                          {act.payload.labItems && act.payload.labItems.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 text-left text-slate-400">
                                    <th className="px-3 py-2 font-medium">รายการตรวจ</th>
                                    <th className="px-3 py-2 font-medium">ผลตรวจ</th>
                                    <th className="px-3 py-2 font-medium">ค่าอ้างอิง</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {act.payload.labItems.map((item, idx) => (
                                    <tr
                                      key={`${item.name}-${idx}`}
                                      className="border-b border-slate-100/70 last:border-0"
                                    >
                                      <td className="px-3 py-2 font-medium text-slate-800">{item.name}</td>
                                      <td className="px-3 py-2 font-semibold text-indigo-700">{item.result}</td>
                                      <td className="px-3 py-2 text-slate-500">
                                        {item.referenceRange || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {act.payload.notes && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                              <span className="block text-[11px] text-slate-500">หมายเหตุถึงแพทย์:</span>
                              <span className="font-medium text-slate-800">{act.payload.notes}</span>
                            </div>
                          )}

                          {act.payload.doctorName && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                              <span className="block text-[11px] text-slate-500">แพทย์ผู้ตรวจต่อ:</span>
                              <span className="font-medium text-slate-800">{act.payload.doctorName}</span>
                              {act.payload.doctorDisease && (
                                <span className="mt-0.5 block text-slate-600">
                                  วินิจฉัย: {act.payload.doctorDisease}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Role Payload: DOCTOR */}
                      {isDoctor && (
                        <div className="space-y-3">
                          {/* Disease & Evaluation Badge Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-50/70 border border-purple-100 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-900 font-semibold">
                                โรคที่วินิจฉัย:
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {act.payload.diseaseName || "-"}
                              </span>
                              {act.payload.diseaseCode && (
                                <span className="font-mono text-xs font-semibold text-purple-700 bg-white border border-purple-200 px-1.5 py-0.5 rounded-md">
                                  {act.payload.diseaseCode}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {act.payload.isCorrect === true ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  วินิจฉัยถูกต้อง
                                </span>
                              ) : act.payload.isCorrect === false ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
                                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                                  ไม่ตรงกับเฉลย
                                  {act.payload.expectedDiseaseCode && (
                                    <span className="text-[10px] font-normal text-red-700">
                                      (เฉลย: {act.payload.expectedDiseaseCode})
                                    </span>
                                  )}
                                </span>
                              ) : null}

                              {typeof act.payload.evaluationScore === "number" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                  {act.payload.evaluationScore} / 10 คะแนน
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Doctor Notes & Plan */}
                          <div className="space-y-2 text-xs">
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                                คำวินิจฉัยและเหตุผลทางการแพทย์:
                              </span>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                {act.payload.doctorDiagnosis || "-"}
                              </p>
                            </div>

                            {act.payload.treatmentPlan && (
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">
                                  แผนการรักษาและการดูแล:
                                </span>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                  {act.payload.treatmentPlan}
                                </p>
                              </div>
                            )}

                            {/* AI Evaluation Box */}
                            {(act.payload.aiFeedback || act.payload.aiStrengths) && (
                              <div className="rounded-xl bg-gradient-to-br from-purple-50/60 to-indigo-50/60 border border-purple-200/80 p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1 font-semibold text-purple-900">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    ผลการประเมินโดย AI
                                  </span>
                                  {act.payload.aiModel && (
                                    <span className="font-mono text-[10px] text-purple-700 bg-white/80 border border-purple-200 px-2 py-0.5 rounded-full">
                                      โมเดล: {act.payload.aiModel}
                                    </span>
                                  )}
                                </div>

                                {act.payload.aiStrengths && (
                                  <div>
                                    <span className="text-[11px] font-semibold text-emerald-800 block">
                                      จุดเด่นที่ทำได้ดี:
                                    </span>
                                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                                      {act.payload.aiStrengths}
                                    </p>
                                  </div>
                                )}

                                {act.payload.aiFeedback && (
                                  <div>
                                    <span className="text-[11px] font-semibold text-purple-900 block">
                                      ข้อเสนอแนะเพื่อการพัฒนา:
                                    </span>
                                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                                      {act.payload.aiFeedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Role Payload: PHARMACIST */}
                      {isPharmacist && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs">
                            <div>
                              <span className="text-amber-900 font-semibold">โรคตามใบสั่งแพทย์: </span>
                              <span className="font-bold text-slate-900">{act.payload.diseaseName || "-"}</span>
                            </div>
                            <div>
                              <span className="text-amber-900 font-semibold">ยอดจ่ายยารวม: </span>
                              <span className="font-bold text-slate-900">{act.payload.totalTablets || 0} เม็ด</span>
                            </div>
                          </div>

                          {act.payload.doctorDiagnosisText && (
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs">
                              <span className="text-slate-500 block text-[11px]">บันทึกการวินิจฉัยของแพทย์:</span>
                              <p className="text-slate-700 mt-0.5">{act.payload.doctorDiagnosisText}</p>
                            </div>
                          )}

                          {/* Medicines Table */}
                          {Array.isArray(act.payload.medicines) && act.payload.medicines.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2">ชื่อยา</th>
                                    <th className="px-3 py-2 text-center">จำนวน</th>
                                    <th className="px-3 py-2">วิธีรับประทาน</th>
                                    <th className="px-3 py-2">คำแนะนำเพิ่มเติม</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {act.payload.medicines.map((med, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-3 py-2 font-medium text-slate-900">
                                        {med.medicineName || med.name || "-"}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono font-semibold text-amber-800">
                                        {med.amount || med.dosage || "-"} {med.unit || "เม็ด"}
                                      </td>
                                      <td className="px-3 py-2 text-slate-700">
                                        {med.instructions || "-"}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">
                                        {med.advice || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          data-pdf-ignore
          className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0"
        >
          <div className="text-xs text-slate-500">
            {exportError ? (
              <span className="font-semibold text-red-600">{exportError}</span>
            ) : (
              <>
                แสดง {filteredActivities.length} จากทั้งหมด{" "}
                {data?.summary.totalSubmissions || 0} รายการ
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exportingPdf}
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingPdf ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              {exportingPdf ? "กำลังสร้าง PDF..." : "ส่งออก PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
