"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FlaskConical,
  HeartPulse,
  IdCard,
  Layers,
  Pill,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
  XCircle,
  Printer,
} from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { downloadElementAsPdf } from "@/lib/pdf-export";
import { formatPatientCode } from "@/lib/patient-code";

interface MedicineItem {
  name: string;
  tabletCount: number;
}

interface ClassroomOption {
  id: string;
  name: string;
  groups: Array<{ id: string; name: string }>;
}

interface SubmissionItem {
  id: string;
  queueNumber: number | null;
  stage: "WAITING_NURSE" | "WAITING_LAB" | "WAITING_DOCTOR" | "WAITING_PHARMACY" | "COMPLETED";
  stageLabel: string;
  diagnosisEvaluation: "PENDING" | "CORRECT" | "INCORRECT" | "NO_KEY";
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    gender: string;
    maritalStatus: string;
  };
  group: {
    id: string;
    name: string;
  };
  classroom: {
    id: string;
    name: string;
  };
  cardRoom: {
    clerkName: string;
    diseaseCode: string | null;
    createdAt: string;
  };
  nurse: {
    id: string;
    nurseName: string;
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
    endocrineGlandChoice: string | null;
    abnormalHormoneChoice: string | null;
    isGlandCorrect: boolean | null;
    isHormoneCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  lab: {
    id: string;
    medTechName: string;
    panelDiseaseCode: string | null;
    panelDiseaseName: string;
    items: Array<{ name: string; result: string; referenceRange: string }>;
    isCorrect: boolean | null;
    evaluationScore?: number | null;
    notes: string | null;
    createdAt: string;
  } | null;
  doctor: {
    id: string;
    doctorName: string;
    diseaseId: string | null;
    diseaseCode: string;
    diseaseName: string;
    doctorDiagnosis: string;
    treatmentPlan: string | null;
    notes: string | null;
    isCorrect?: boolean | null;
    evaluationScore?: number | null;
    aiModel?: string | null;
    aiFeedback?: string | null;
    aiStrengths?: string | null;
    aiEvaluatedAt?: string | null;
    createdAt: string;
  } | null;
  pharmacy: {
    id: string;
    pharmacistName: string;
    medicines: unknown;
    totalTablets: number | null;
    hormoneChoiceKey: string | null;
    hormoneChoiceLabel: string | null;
    treatmentChoiceKey: string | null;
    treatmentChoiceLabel: string | null;
    isHormoneCorrect: boolean | null;
    isTreatmentCorrect: boolean | null;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
}

interface SubmissionListItem {
  id: string;
  queueNumber: number | null;
  stage: "WAITING_NURSE" | "WAITING_LAB" | "WAITING_DOCTOR" | "WAITING_PHARMACY" | "COMPLETED";
  stageLabel: string;
  diagnosisEvaluation: "PENDING" | "CORRECT" | "INCORRECT" | "NO_KEY";
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    gender: string;
    maritalStatus: string;
  };
  group: { id: string; name: string };
  classroom: { id: string; name: string };
  cardRoom: { clerkName: string; diseaseCode: string | null; createdAt: string };
  nurse: {
    id: string;
    nurseName: string;
    systolicBp: number;
    diastolicBp: number;
    pulseBpm: number;
    chiefComplaint: string | null;
    symptomDescription: string;
    endocrineGlandChoice: string | null;
    abnormalHormoneChoice: string | null;
    isGlandCorrect: boolean | null;
    isHormoneCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  lab: {
    id: string;
    medTechName: string;
    panelDiseaseName: string;
    itemCount: number;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
  doctor: {
    id: string;
    doctorName: string;
    diseaseCode: string | null;
    diseaseName: string;
    doctorDiagnosis: string;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    aiModel: string | null;
    createdAt: string;
  } | null;
  pharmacy: {
    id: string;
    pharmacistName: string;
    totalTablets: number | null;
    hormoneChoiceKey: string | null;
    treatmentChoiceKey: string | null;
    isHormoneCorrect: boolean | null;
    isTreatmentCorrect: boolean | null;
    isCorrect: boolean | null;
    evaluationScore: number | null;
    createdAt: string;
  } | null;
}

interface Metrics {
  totalCases: number;
  waitingNurseCount: number;
  waitingLabCount: number;
  waitingDoctorCount: number;
  waitingPharmacyCount: number;
  completedCount: number;
  diagnosedCount: number;
  correctDiagnosesCount: number;
  accuracyRate: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SCORE_MAXIMUMS = {
  total: 17,
  nurse: 2,
  doctor: 10,
  medTech: 2,
  pharmacist: 3,
} as const;

function formatScore(score: number | null | undefined, maximum: number) {
  return `${typeof score === "number" ? score : "—"}/${maximum}`;
}

function ScoreSummary({
  nurseScore,
  doctorScore,
  medTechScore,
  pharmacistScore,
  compact = false,
}: {
  nurseScore: number | null | undefined;
  doctorScore: number | null | undefined;
  medTechScore: number | null | undefined;
  pharmacistScore: number | null | undefined;
  compact?: boolean;
}) {
  const scoredParts = [nurseScore, doctorScore, medTechScore, pharmacistScore].filter(
    (score): score is number => typeof score === "number"
  );

  if (scoredParts.length === 0) return null;

  const totalScore = scoredParts.reduce((sum, score) => sum + score, 0);
  const chipClass = compact
    ? "inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-0.5"
    : "inline-flex items-center gap-1 rounded-xl border bg-white px-2.5 py-1.5";

  return (
    <div
      className={
        compact
          ? "inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[11px] font-bold text-slate-700"
          : "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3"
      }
      aria-label="สรุปคะแนน"
    >
      {!compact && (
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          สรุปคะแนนประเมิน
        </p>
      )}
      <div className={compact ? "contents" : "flex flex-wrap items-center gap-2"}>
        <span className={`${chipClass} border-emerald-300 text-emerald-800`}>
          <span>รวมทั้งหมด</span>
          <strong className="font-mono text-emerald-900">
            {formatScore(totalScore, SCORE_MAXIMUMS.total)}
          </strong>
        </span>
        <span className={`${chipClass} border-emerald-200 text-emerald-800`}>
          <span>พยาบาล</span>
          <strong className="font-mono">{formatScore(nurseScore ?? 0, SCORE_MAXIMUMS.nurse)}</strong>
        </span>
        <span className={`${chipClass} border-sky-200 text-sky-800`}>
          <span>แพทย์</span>
          <strong className="font-mono">{formatScore(doctorScore, SCORE_MAXIMUMS.doctor)}</strong>
        </span>
        <span className={`${chipClass} border-indigo-200 text-indigo-800`}>
          <span>เทคนิคการแพทย์</span>
          <strong className="font-mono">
            {formatScore(medTechScore ?? 0, SCORE_MAXIMUMS.medTech)}
          </strong>
        </span>
        <span className={`${chipClass} border-fuchsia-200 text-fuchsia-800`}>
          <span>เภสัชกร</span>
          <strong className="font-mono">
            {formatScore(pharmacistScore ?? 0, SCORE_MAXIMUMS.pharmacist)}
          </strong>
        </span>
      </div>
    </div>
  );
}

export function MonitorContent({
  initialClassroomId,
  initialGroupId,
}: {
  initialClassroomId?: string;
  initialGroupId?: string;
}) {
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(initialClassroomId || "");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "ALL");
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [evalFilter, setEvalFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Modal for full dossier
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const classroomsLoaded = useRef(false);
  const skipNextClassroomSelectionFetch = useRef(false);
  const listRequestController = useRef<AbortController | null>(null);

  const fetchSubmissions = useCallback(
    async (showLoading = true) => {
      listRequestController.current?.abort();
      const controller = new AbortController();
      listRequestController.current = controller;

      try {
        if (showLoading) setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedClassroomId) params.set("classroomId", selectedClassroomId);
        if (selectedGroupId && selectedGroupId !== "ALL") params.set("groupId", selectedGroupId);
        if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
        if (stageFilter !== "ALL") params.set("stage", stageFilter);
        if (evalFilter !== "ALL") params.set("evaluation", evalFilter);
        params.set("page", String(currentPage));
        params.set("pageSize", String(itemsPerPage));
        if (!classroomsLoaded.current) params.set("includeClassrooms", "1");

        const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "ไม่สามารถดึงข้อมูลการส่งตรวจได้");
        }

        if (
          Array.isArray(json.data.classrooms) &&
          (json.data.classrooms.length > 0 || !classroomsLoaded.current)
        ) {
          setClassrooms(json.data.classrooms);
          classroomsLoaded.current = true;
        }
        if (!selectedClassroomId && json.data.selectedClassroomId) {
          skipNextClassroomSelectionFetch.current = true;
          setSelectedClassroomId(json.data.selectedClassroomId);
        }
        setSubmissions(json.data.submissions || []);
        setMetrics(json.data.metrics || null);
        setGroupCounts(json.data.groupCounts || {});
        setPagination(json.data.pagination || { page: 1, pageSize: itemsPerPage, total: 0, totalPages: 1 });
        setLastRefreshedAt(new Date());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (listRequestController.current === controller) {
          listRequestController.current = null;
          if (showLoading) setLoading(false);
        }
      }
    },
    [
      currentPage,
      debouncedSearchQuery,
      evalFilter,
      itemsPerPage,
      selectedClassroomId,
      selectedGroupId,
      stageFilter,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Initial fetch and when a server-side query control changes.
  useEffect(() => {
    if (skipNextClassroomSelectionFetch.current) {
      skipNextClassroomSelectionFetch.current = false;
      return;
    }
    const timer = window.setTimeout(() => void fetchSubmissions(true), 0);
    return () => window.clearTimeout(timer);
  }, [fetchSubmissions]);

  useEffect(() => {
    return () => {
      listRequestController.current?.abort();
      listRequestController.current = null;
    };
  }, []);

  // Auto-refresh countdown interval (every 1 second if enabled)
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    let secondsLeft = 10;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        secondsLeft = 10;
        fetchSubmissions(false);
      }
      setCountdown(secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchSubmissions]);

  const handleToggleAutoRefresh = () => {
    setCountdown(10);
    setAutoRefresh((prev) => !prev);
  };

  const handleManualRefresh = () => {
    setCountdown(10);
    fetchSubmissions(false);
  };

  const handleOpenSubmission = async (submissionId: string) => {
    if (detailLoadingId) return;

    try {
      setDetailLoadingId(submissionId);
      setDetailError(null);
      const response = await fetch(
        `/api/admin/submissions?id=${encodeURIComponent(submissionId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถโหลดบันทึกฉบับเต็มได้");
      }
      setSelectedSubmission(result.data as SubmissionItem);
    } catch (detailFetchError) {
      setDetailError(
        detailFetchError instanceof Error
          ? detailFetchError.message
          : "ไม่สามารถโหลดบันทึกฉบับเต็มได้"
      );
    } finally {
      setDetailLoadingId(null);
    }
  };

  // ส่งออกเวชระเบียนในโมดัลเป็นไฟล์ PDF ดาวน์โหลดลงเครื่อง
  const handleExportPdf = async () => {
    const record = document.getElementById("printable-medical-record");
    if (!record || !selectedSubmission || exportingPdf) return;

    try {
      setExportingPdf(true);
      setExportError(null);
      const patientCode = formatPatientCode(selectedSubmission.queueNumber);
      const today = new Date().toISOString().slice(0, 10);
      await downloadElementAsPdf(
        record,
        `เวชระเบียน-รหัสผู้ป่วย${patientCode}-${selectedSubmission.group.name}-${today}.pdf`
      );
    } catch (error) {
      console.error("Failed to export medical record PDF:", error);
      setExportError(
        error instanceof Error ? error.message : "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setExportingPdf(false);
    }
  };

  // Active classroom object
  const currentClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  const totalPages = pagination.totalPages;
  const activePage = pagination.page;
  const visiblePages = Array.from(
    new Set([1, activePage - 1, activePage, activePage + 1, totalPages])
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  function formatTime(isoString: string | null | undefined) {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  }

  function formatDateTime(isoString: string | null | undefined) {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-red-600 transition-colors">
            หน้าหลัก
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">ติดตามการส่งตรวจของแต่ละห้องตรวจ</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={handleToggleAutoRefresh}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              autoRefresh
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/10"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-ping" : "bg-slate-300"
              }`}
            />
            <span>
              {autoRefresh ? (
                <>
                  Auto-refresh: เปิดอยู่ (
                  <span className="inline-block min-w-[20px] text-center font-mono font-bold tabular-nums">
                    {countdown}s
                  </span>
                  )
                </>
              ) : (
                "เปิด Auto-refresh"
              )}
            </span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-red-600" : ""}`} />
            <span>รีเฟรช</span>
          </button>
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            {formatTime(lastRefreshedAt.toISOString())}
          </span>
        </div>
      </div>

      {/* Classroom & Group Selection Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
              <Activity className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-lg font-bold text-slate-900 sm:text-xl">
                ติดตามการส่งตรวจของแต่ละห้องตรวจ (Room Monitor)
              </h1>
              <p className="text-xs text-slate-500">
                ตรวจสอบการรับส่งคนไข้ระหว่าง 4 สถานีแบบเรียลไทม์ พร้อมระบบเปรียบเทียบผลวินิจฉัยกับเฉลย
              </p>
            </div>
          </div>

          {/* Classroom Selector */}
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:shrink-0 md:flex-row md:items-center">
            <span className="shrink-0 text-xs font-semibold text-slate-600">เลือกห้องเรียน:</span>
            <AppSelect
              size="filter"
              className="w-full min-w-0 md:w-72"
              ariaLabel="เลือกห้องเรียน"
              placeholder="เลือกห้องเรียน"
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedClassroomId}
              onChange={(id) => {
                setSelectedClassroomId(id);
                setSelectedGroupId("ALL");
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Group Tabs */}
        {currentClassroom && (
          <div className="border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> ห้องตรวจ:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId("ALL");
                  setCurrentPage(1);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  selectedGroupId === "ALL"
                    ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ทุกห้องตรวจ ({metrics?.totalCases ?? 0})
              </button>
              {currentClassroom.groups.map((group) => {
                const groupCount = groupCounts[group.id] ?? 0;
                const isSelected = selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setCurrentPage(1);
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {group.name} ({groupCount})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Summary KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              คิวทั้งหมด
            </span>
            <p className="mt-1 text-2xl font-black text-slate-900">{metrics.totalCases}</p>
            <span className="text-[10px] text-slate-400">เคสที่ออกบัตรแล้ว</span>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              รอซักประวัติ
            </span>
            <p className="mt-1 text-2xl font-black text-amber-900">{metrics.waitingNurseCount}</p>
            <span className="text-[10px] text-amber-700/80">อยู่ที่ห้องบัตร</span>
          </div>

          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              รอผลแล็บ
            </span>
            <p className="mt-1 text-2xl font-black text-indigo-900">{metrics.waitingLabCount}</p>
            <span className="text-[10px] text-indigo-700/80">อยู่ที่เทคนิคการแพทย์</span>
          </div>

          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              รอตรวจวินิจฉัย
            </span>
            <p className="mt-1 text-2xl font-black text-sky-900">{metrics.waitingDoctorCount}</p>
            <span className="text-[10px] text-sky-700/80">ส่งต่อให้แพทย์</span>
          </div>

          <div className="rounded-2xl border border-fuchsia-200/80 bg-fuchsia-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-700">
              รอจ่ายยา
            </span>
            <p className="mt-1 text-2xl font-black text-fuchsia-900">{metrics.waitingPharmacyCount}</p>
            <span className="text-[10px] text-fuchsia-700/80">ส่งต่อไปห้องยา</span>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              เสร็จสิ้นรอบรักษา
            </span>
            <p className="mt-1 text-2xl font-black text-emerald-900">{metrics.completedCount}</p>
            <span className="text-[10px] text-emerald-700/80">จ่ายยาเรียบร้อย</span>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              ความแม่นยำวินิจฉัย
            </span>
            <p className="mt-1 text-2xl font-black text-rose-900">
              {metrics.diagnosedCount > 0 ? `${metrics.accuracyRate}%` : "-"}
            </p>
            <span className="text-[10px] text-rose-700/80">
              {metrics.correctDiagnosesCount}/{metrics.diagnosedCount} เคสถูกต้อง
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold">สถานะ:</span>
            <AppSelect
              size="compact"
              className="w-40"
              ariaLabel="กรองตามสถานะ"
              options={[
                { value: "ALL", label: "ทุกสถานะ" },
                { value: "WAITING_NURSE", label: "รอซักประวัติ" },
                { value: "WAITING_LAB", label: "รอผลแล็บ" },
                { value: "WAITING_DOCTOR", label: "รอตรวจวินิจฉัย" },
                { value: "WAITING_PHARMACY", label: "รอจ่ายยา" },
                { value: "COMPLETED", label: "เสร็จสิ้น" },
              ]}
              value={stageFilter}
              onChange={(value) => {
                setStageFilter(value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Evaluation Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold">ผลวินิจฉัย:</span>
            <AppSelect
              size="compact"
              className="w-56"
              ariaLabel="กรองตามผลวินิจฉัย"
              options={[
                { value: "ALL", label: "ทั้งหมด" },
                { value: "CORRECT", label: "วินิจฉัยถูกต้อง (ตรงเฉลย)" },
                { value: "INCORRECT", label: "วินิจฉัยไม่ตรงเฉลย" },
                { value: "PENDING", label: "ยังไม่วินิจฉัย" },
                { value: "NO_KEY", label: "ไม่มีเฉลย" },
              ]}
              value={evalFilter}
              onChange={(value) => {
                setEvalFilter(value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อผู้ป่วย, รหัสผู้ป่วย, โรค..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {detailError && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {detailError}
        </p>
      )}

      {/* Submissions List */}
      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <p className="font-bold text-sm">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setCountdown(10);
              fetchSubmissions(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>
        </div>
      ) : loading && submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-red-600 mb-3" />
          <p className="text-sm font-semibold">กำลังโหลดข้อมูลการส่งตรวจของแต่ละห้องตรวจ...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Activity className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ยังไม่มีข้อมูลการส่งตรวจ</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {searchQuery || stageFilter !== "ALL" || evalFilter !== "ALL"
              ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง ลองเปลี่ยนหรือล้างตัวกรอง"
              : "เมื่อนักเรียนเริ่มออกบัตรผู้ป่วยและส่งต่อในแต่ละห้องตรวจ ข้อมูลจะปรากฏที่นี่แบบเรียลไทม์"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            return (
              <div
                key={sub.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Queue Badge */}
                    <span className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                      รหัสผู้ป่วย {formatPatientCode(sub.queueNumber)}
                    </span>

                    {/* Group Badge */}
                    <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                      <Layers className="h-3 w-3 text-slate-400" />
                      {sub.group.name}
                    </span>

                    {/* Stage Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                        sub.stage === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : sub.stage === "WAITING_PHARMACY"
                          ? "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200"
                          : sub.stage === "WAITING_DOCTOR"
                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                          : sub.stage === "WAITING_LAB"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {sub.stageLabel}
                    </span>

                    {/* Diagnosis Evaluation Badge */}
                    {sub.doctor && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                          sub.diagnosisEvaluation === "CORRECT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : sub.diagnosisEvaluation === "INCORRECT"
                            ? "bg-rose-50 text-rose-700 border border-rose-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {sub.diagnosisEvaluation === "CORRECT" ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>วินิจฉัยถูกต้อง (ตรงเฉลย)</span>
                          </>
                        ) : sub.diagnosisEvaluation === "INCORRECT" ? (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            <span>วินิจฉัยไม่ตรงเฉลย</span>
                          </>
                        ) : (
                          <span>ไม่มีเฉลยรหัสโรค</span>
                        )}
                      </span>
                    )}

                    {/* Score Summary */}
                    <ScoreSummary
                      nurseScore={sub.nurse?.evaluationScore}
                      doctorScore={sub.doctor?.evaluationScore}
                      medTechScore={sub.lab?.evaluationScore}
                      pharmacistScore={sub.pharmacy?.evaluationScore}
                      compact
                    />

                    {/* AI Score Fallback */}
                    {sub.doctor && sub.doctor.evaluationScore === null && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                        <span>AI ไม่พร้อมใช้งาน</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenSubmission(sub.id)}
                      disabled={detailLoadingId === sub.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                    >
                      {detailLoadingId === sub.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      <span>{detailLoadingId === sub.id ? "กำลังโหลด..." : "ดูบันทึกฉบับเต็ม"}</span>
                    </button>
                  </div>
                </div>

                {/* Patient Information Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-900 text-sm">
                      {sub.patient.fullName}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-600">อายุ {sub.patient.age} ปี</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-600">เพศ {sub.patient.gender}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-600">สถานภาพ {sub.patient.maritalStatus}</span>
                  </div>

                  {/* Secret Card Room Code (Visible only to Admin!) */}
                  {sub.cardRoom.diseaseCode && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                      <span className="text-amber-700">เฉลยรหัสโรคจากห้องบัตร:</span>
                      <span className="font-mono underline">{sub.cardRoom.diseaseCode}</span>
                    </div>
                  )}
                </div>

                {/* 5-Station Pipeline Stepper Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-xs">
                  {/* Station 1: ห้องบัตร */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-amber-700">
                        <IdCard className="h-3.5 w-3.5" /> 1. ห้องบัตร
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTime(sub.cardRoom.createdAt)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ผู้บันทึก:</span>
                        <span className="font-semibold text-slate-800">{sub.cardRoom.clerkName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">รหัสโรค:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {sub.cardRoom.diseaseCode || "ไม่ได้ระบุ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Station 2: พยาบาล */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 font-bold ${
                          sub.nurse ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        <HeartPulse className="h-3.5 w-3.5" /> 2. พยาบาล
                      </span>
                      {sub.nurse && (
                        <span className="text-[10px] text-slate-400">
                          {formatTime(sub.nurse.createdAt)}
                        </span>
                      )}
                    </div>
                    {sub.nurse ? (
                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ผู้ซักประวัติ:</span>
                          <span className="font-semibold text-slate-800">{sub.nurse.nurseName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ความดัน/ชีพจร:</span>
                          <span className="font-semibold text-slate-800">
                            {sub.nurse.systolicBp}/{sub.nurse.diastolicBp} · {sub.nurse.pulseBpm} bpm
                          </span>
                        </div>
                        {sub.nurse.endocrineGlandChoice && (
                          <>
                            <div className="flex justify-between gap-2">
                              <span className="shrink-0 text-slate-400">ต่อมไร้ท่อ:</span>
                              <span
                                className={`truncate text-right font-bold ${
                                  sub.nurse.isGlandCorrect === false ? "text-rose-600" : "text-emerald-700"
                                }`}
                              >
                                {sub.nurse.endocrineGlandChoice}
                                {sub.nurse.isGlandCorrect === true
                                  ? " ✓"
                                  : sub.nurse.isGlandCorrect === false
                                    ? " ✗"
                                    : ""}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="shrink-0 text-slate-400">ฮอร์โมน:</span>
                              <span
                                className={`truncate text-right font-bold ${
                                  sub.nurse.isHormoneCorrect === false ? "text-rose-600" : "text-emerald-700"
                                }`}
                              >
                                {sub.nurse.abnormalHormoneChoice}
                                {sub.nurse.isHormoneCorrect === true
                                  ? " ✓"
                                  : sub.nurse.isHormoneCorrect === false
                                    ? " ✗"
                                    : ""}
                              </span>
                            </div>
                            {sub.nurse.evaluationScore !== null && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">คะแนน:</span>
                                <span className="font-bold text-emerald-900">
                                  {sub.nurse.evaluationScore}/{SCORE_MAXIMUMS.nurse}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          <span className="text-slate-400">อาการ:</span> {sub.nurse.symptomDescription}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-slate-400 italic">
                        รอสถานีพยาบาลซักประวัติ...
                      </div>
                    )}
                  </div>

                  {/* Station 3: เทคนิคการแพทย์ */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 font-bold ${
                          sub.lab ? "text-indigo-700" : "text-slate-400"
                        }`}
                      >
                        <FlaskConical className="h-3.5 w-3.5" /> 3. เทคนิคการแพทย์
                      </span>
                      {sub.lab && (
                        <span className="text-[10px] text-slate-400">
                          {formatTime(sub.lab.createdAt)}
                        </span>
                      )}
                    </div>
                    {sub.lab ? (
                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ผู้ส่งผล:</span>
                          <span className="font-semibold text-slate-800">{sub.lab.medTechName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ชุดผลตรวจ:</span>
                          <span
                            className="max-w-[120px] truncate font-bold text-indigo-900"
                            title={sub.lab.panelDiseaseName}
                          >
                            {sub.lab.panelDiseaseName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-[11px]">
                          <span className="text-slate-400">{sub.lab.itemCount} รายการ</span>
                          {sub.lab.isCorrect === null ? (
                            <span className="font-semibold text-slate-400">ไม่มีเฉลย</span>
                          ) : sub.lab.isCorrect ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> ตรงเฉลย
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                              <XCircle className="h-3 w-3" /> ไม่ตรงเฉลย
                            </span>
                          )}
                        </div>
                        {sub.lab.evaluationScore !== null && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-400">คะแนน:</span>
                            <span
                              className={`font-black font-mono ${
                                sub.lab.isCorrect ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {sub.lab.evaluationScore}/2
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-slate-400 italic">
                        รอเทคนิคการแพทย์ส่งผลตรวจ...
                      </div>
                    )}
                  </div>

                  {/* Station 4: แพทย์ */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 font-bold ${
                          sub.doctor ? "text-sky-700" : "text-slate-400"
                        }`}
                      >
                        <Stethoscope className="h-3.5 w-3.5" /> 4. แพทย์
                      </span>
                      {sub.doctor && (
                        <span className="text-[10px] text-slate-400">
                          {formatTime(sub.doctor.createdAt)}
                        </span>
                      )}
                    </div>
                    {sub.doctor ? (
                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">แพทย์:</span>
                          <span className="font-semibold text-slate-800">{sub.doctor.doctorName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">โรคที่วินิจฉัย:</span>
                          <span className="font-bold text-sky-900 truncate max-w-[120px]" title={sub.doctor.diseaseName}>
                            {sub.doctor.diseaseName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          <span className="text-slate-400">ผล:</span> {sub.doctor.doctorDiagnosis}
                        </p>
                        {sub.doctor.evaluationScore !== undefined && sub.doctor.evaluationScore !== null ? (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-sky-600" /> คะแนน AI:
                            </span>
                            <div className="flex items-center gap-1.5">
                              {sub.doctor.aiModel && (
                                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[85px]" title={sub.doctor.aiModel}>
                                  {sub.doctor.aiModel}
                                </span>
                              )}
                              <span
                                className={`font-black font-mono ${
                                  sub.doctor.isCorrect ? "text-emerald-700" : "text-rose-700"
                                }`}
                              >
                                {sub.doctor.evaluationScore}/10
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-600" /> ตรวจโดย AI:
                            </span>
                            <span className="font-semibold text-amber-700">
                              ไม่พร้อมใช้งาน
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-slate-400 italic">
                        รอแพทย์ตรวจวินิจฉัย...
                      </div>
                    )}
                  </div>

                  {/* Station 5: เภสัชกร */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 font-bold ${
                          sub.pharmacy ? "text-fuchsia-700" : "text-slate-400"
                        }`}
                      >
                        <Pill className="h-3.5 w-3.5" /> 5. ห้องยา
                      </span>
                      {sub.pharmacy && (
                        <span className="text-[10px] text-slate-400">
                          {formatTime(sub.pharmacy.createdAt)}
                        </span>
                      )}
                    </div>
                    {sub.pharmacy ? (
                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">เภสัชกร:</span>
                          <span className="font-semibold text-slate-800">
                            {sub.pharmacy.pharmacistName}
                          </span>
                        </div>
                        {sub.pharmacy.hormoneChoiceKey ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ฮอร์โมน:</span>
                              <span
                                className={`font-bold ${
                                  sub.pharmacy.isHormoneCorrect ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {sub.pharmacy.hormoneChoiceKey}
                                {sub.pharmacy.isHormoneCorrect === true
                                  ? " ✓"
                                  : sub.pharmacy.isHormoneCorrect === false
                                    ? " ✗"
                                    : ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ยา/การรักษา:</span>
                              <span
                                className={`font-bold ${
                                  sub.pharmacy.isTreatmentCorrect ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {sub.pharmacy.treatmentChoiceKey}
                                {sub.pharmacy.isTreatmentCorrect === true
                                  ? " ✓"
                                  : sub.pharmacy.isTreatmentCorrect === false
                                    ? " ✗"
                                    : ""}
                              </span>
                            </div>
                            {sub.pharmacy.evaluationScore !== null && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">คะแนน:</span>
                                <span className="font-bold text-fuchsia-900">
                                  {sub.pharmacy.evaluationScore}/{SCORE_MAXIMUMS.pharmacist}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-slate-400">จ่ายยาทั้งหมด:</span>
                            <span className="font-bold text-fuchsia-900">
                              {sub.pharmacy.totalTablets ?? 0} เม็ด
                            </span>
                          </div>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> เสร็จสิ้นการรักษา
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-slate-400 italic">
                        รอสถานีห้องยาจ่ายยา...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Bar */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:px-6 text-xs text-slate-500 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span>
                  แสดง <span className="font-semibold text-slate-800">{(activePage - 1) * itemsPerPage + 1}</span> ถึง{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(activePage * itemsPerPage, pagination.total)}
                  </span>{" "}
                  จากทั้งหมด <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> คิว
                </span>

                <span className="text-slate-300 hidden sm:inline">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">แสดงหน้าละ:</span>
                  <AppSelect
                    size="compact"
                    className="w-28"
                    ariaLabel="จำนวนคิวต่อหน้า"
                    options={[
                      { value: "10", label: "10 คิว" },
                      { value: "20", label: "20 คิว" },
                      { value: "50", label: "50 คิว" },
                    ]}
                    value={String(itemsPerPage)}
                    onChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {visiblePages
                    .map((page, idx, array) => {
                      const prevPage = array[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <div key={page} className="flex items-center gap-1.5">
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`flex h-8 min-w-8 px-2.5 items-center justify-center rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              activePage === page
                                ? "bg-red-600 text-white shadow-xs"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full Dossier Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div id="printable-medical-record" className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                    รหัสผู้ป่วย {formatPatientCode(selectedSubmission.queueNumber)}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {selectedSubmission.group.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ห้องเรียน: {selectedSubmission.classroom.name}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  บันทึกเวชระเบียนผู้ป่วย: {selectedSubmission.patient.fullName}
                </h3>
              </div>
              <button
                type="button"
                data-pdf-ignore
                onClick={() => setSelectedSubmission(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div data-pdf-block className="mt-4">
              <ScoreSummary
                nurseScore={selectedSubmission.nurse?.evaluationScore}
                doctorScore={selectedSubmission.doctor?.evaluationScore}
                medTechScore={selectedSubmission.lab?.evaluationScore}
                pharmacistScore={selectedSubmission.pharmacy?.evaluationScore}
              />
            </div>

            {/* Modal Content */}
            <div className="mt-5 space-y-6 text-sm">
              {/* Patient Basic Profile */}
              <div data-pdf-block className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  ข้อมูลประจำตัวผู้ป่วย (จากห้องบัตร)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">ชื่อ-นามสกุล:</span>
                    <p className="font-bold text-slate-800">{selectedSubmission.patient.fullName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">อายุ:</span>
                    <p className="font-bold text-slate-800">{selectedSubmission.patient.age} ปี</p>
                  </div>
                  <div>
                    <span className="text-slate-400">เพศ:</span>
                    <p className="font-bold text-slate-800">{selectedSubmission.patient.gender}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">สถานภาพ:</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.patient.maritalStatus}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">เจ้าหน้าที่ออกบัตร:</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.cardRoom.clerkName}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">เวลาออกบัตร:</span>
                    <p className="font-bold text-slate-800">
                      {formatDateTime(selectedSubmission.cardRoom.createdAt)}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-amber-100/70 p-2 border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-800">
                      เฉลยรหัสโรคที่ห้องบัตรตั้งไว้:
                    </span>
                    <p className="font-mono text-sm font-black text-amber-950">
                      {selectedSubmission.cardRoom.diseaseCode || "(ไม่ได้ระบุ)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Station 2: Nurse Info */}
              <div data-pdf-block className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4" /> บันทึกการซักประวัติและสัญญาณชีพ (พยาบาล)
                  </h4>
                  {selectedSubmission.nurse && (
                    <span className="text-xs text-slate-500">
                      โดย: <strong>{selectedSubmission.nurse.nurseName}</strong> ·{" "}
                      {formatDateTime(selectedSubmission.nurse.createdAt)}
                    </span>
                  )}
                </div>

                {selectedSubmission.nurse ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-xl bg-white p-2 border border-emerald-100">
                        <span className="text-slate-400">ความดันโลหิต</span>
                        <p className="font-bold text-slate-800">
                          {selectedSubmission.nurse.systolicBp}/{selectedSubmission.nurse.diastolicBp}{" "}
                          mmHg
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-emerald-100">
                        <span className="text-slate-400">ชีพจร</span>
                        <p className="font-bold text-slate-800">
                          {selectedSubmission.nurse.pulseBpm} bpm
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-emerald-100">
                        <span className="text-slate-400">น้ำหนัก / ส่วนสูง</span>
                        <p className="font-bold text-slate-800">
                          {selectedSubmission.nurse.weightKg} กก. / {selectedSubmission.nurse.heightCm}{" "}
                          ซม.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-emerald-100">
                        <span className="text-slate-400">โรคประจำตัว</span>
                        <p className="font-bold text-slate-800">
                          {selectedSubmission.nurse.chronicDiseaseStatus === "YES"
                            ? selectedSubmission.nurse.chronicDiseaseDetails
                            : selectedSubmission.nurse.chronicDiseaseStatus === "NONE"
                            ? "ไม่มี"
                            : "ไม่ทราบ"}
                        </p>
                      </div>
                    </div>

                    <div data-pdf-block className="rounded-xl bg-white p-3 border border-emerald-100 space-y-2">
                      <div>
                        <span className="text-slate-400 font-semibold">อาการจากโรค:</span>
                        <p className="whitespace-pre-wrap font-medium text-slate-800 mt-0.5">
                          {selectedSubmission.nurse.symptomDescription}
                        </p>
                      </div>
                      {selectedSubmission.nurse.notes && (
                        <div>
                          <span className="text-slate-400 font-semibold">หมายเหตุ:</span>
                          <p className="font-medium text-slate-800 mt-0.5">
                            {selectedSubmission.nurse.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedSubmission.nurse.endocrineGlandChoice && (
                      <div data-pdf-block className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(
                            [
                              [
                                "ต่อมไร้ท่อที่ผิดปกติ",
                                selectedSubmission.nurse.endocrineGlandChoice,
                                selectedSubmission.nurse.isGlandCorrect,
                              ],
                              [
                                "ฮอร์โมนที่ผิดปกติ",
                                selectedSubmission.nurse.abnormalHormoneChoice,
                                selectedSubmission.nurse.isHormoneCorrect,
                              ],
                            ] as const
                          ).map(([heading, choice, correct]) => (
                            <div
                              key={heading}
                              className={`rounded-xl border p-3 ${
                                correct === true
                                  ? "border-emerald-200 bg-emerald-50/60"
                                  : correct === false
                                    ? "border-rose-200 bg-rose-50/60"
                                    : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="font-bold text-slate-500">{heading}</span>
                                <span
                                  className={`font-bold ${
                                    correct === true
                                      ? "text-emerald-700"
                                      : correct === false
                                        ? "text-rose-600"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {correct === true ? "ถูกต้อง" : correct === false ? "ไม่ถูกต้อง" : "ไม่มีเฉลย"}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-800">{choice}</p>
                            </div>
                          ))}
                        </div>
                        {selectedSubmission.nurse.evaluationScore !== null && (
                          <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white p-3 text-sm font-bold">
                            <span>คะแนนสถานีพยาบาล:</span>
                            <span className="text-emerald-900">
                              {selectedSubmission.nurse.evaluationScore}/{SCORE_MAXIMUMS.nurse}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีการบันทึกจากพยาบาล</p>
                )}
              </div>

              {/* Station 3: Lab Result */}
              <div data-pdf-block className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4" /> ผลตรวจทางห้องปฏิบัติการ (เทคนิคการแพทย์)
                  </h4>
                  {selectedSubmission.lab && (
                    <span className="text-xs text-slate-500">
                      โดย: <strong>{selectedSubmission.lab.medTechName}</strong> ·{" "}
                      {formatDateTime(selectedSubmission.lab.createdAt)}
                    </span>
                  )}
                </div>

                {selectedSubmission.lab ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 font-bold text-indigo-900">
                        ชุดผลตรวจ: {selectedSubmission.lab.panelDiseaseName}
                        {selectedSubmission.lab.panelDiseaseCode
                          ? ` (${selectedSubmission.lab.panelDiseaseCode})`
                          : ""}
                      </span>
                      {selectedSubmission.lab.isCorrect === null ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 font-bold text-slate-500">
                          ห้องบัตรไม่ได้ระบุเฉลย
                        </span>
                      ) : selectedSubmission.lab.isCorrect ? (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> ชุดตรวจตรงเฉลย
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
                          <XCircle className="h-3.5 w-3.5" /> ชุดตรวจไม่ตรงเฉลย
                        </span>
                      )}
                      {selectedSubmission.lab.evaluationScore !== null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-black font-mono ${
                            selectedSubmission.lab.isCorrect
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-rose-300 bg-rose-50 text-rose-700"
                          }`}
                        >
                          คะแนน: {selectedSubmission.lab.evaluationScore}/2
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-slate-400">
                            <th className="px-3 py-2 font-bold">รายการตรวจ</th>
                            <th className="px-3 py-2 font-bold">ผลตรวจ</th>
                            <th className="px-3 py-2 font-bold">ค่าอ้างอิง</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSubmission.lab.items.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className="border-b border-slate-50 last:border-0">
                              <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                              <td className="px-3 py-2 font-bold text-indigo-700">{item.result}</td>
                              <td className="px-3 py-2 text-slate-500">{item.referenceRange || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedSubmission.lab.notes && (
                      <div className="rounded-xl bg-white p-3 border border-indigo-100">
                        <span className="text-slate-400 font-semibold">หมายเหตุจากห้องแล็บ:</span>
                        <p className="font-medium text-slate-800 mt-0.5">
                          {selectedSubmission.lab.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีการส่งผลตรวจจากเทคนิคการแพทย์</p>
                )}
              </div>

              {/* Station 4: Doctor Diagnosis */}
              <div data-pdf-block className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4" /> บันทึกการวินิจฉัยโรค (แพทย์)
                  </h4>
                  {selectedSubmission.doctor && (
                    <span className="text-xs text-slate-500">
                      โดย: <strong>{selectedSubmission.doctor.doctorName}</strong> ·{" "}
                      {formatDateTime(selectedSubmission.doctor.createdAt)}
                    </span>
                  )}
                </div>

                {selectedSubmission.doctor ? (
                  <div className="space-y-3 text-xs">
                    {/* Diagnosis Comparison Card */}
                    <div className="rounded-xl bg-white p-3 border border-sky-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-slate-400">โรคที่แพทย์วินิจฉัย:</span>
                          <p className="text-sm font-black text-sky-900">
                            {selectedSubmission.doctor.diseaseName}{" "}
                            <span className="font-mono text-xs text-slate-400">
                              (รหัส: {selectedSubmission.doctor.diseaseCode})
                            </span>
                          </p>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-bold ${
                              selectedSubmission.diagnosisEvaluation === "CORRECT"
                                ? "bg-emerald-100 text-emerald-800"
                                : selectedSubmission.diagnosisEvaluation === "INCORRECT"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {selectedSubmission.diagnosisEvaluation === "CORRECT" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>ตรงกับเฉลยของห้องบัตร</span>
                              </>
                            ) : selectedSubmission.diagnosisEvaluation === "INCORRECT" ? (
                              <>
                                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                <span>ไม่ตรงกับเฉลยของห้องบัตร</span>
                              </>
                            ) : (
                              <span>ไม่มีเฉลยรหัสโรค</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold">รายละเอียดการวินิจฉัยของแพทย์:</span>
                        <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-line">
                          {selectedSubmission.doctor.doctorDiagnosis}
                        </p>
                      </div>

                      {/* AI Evaluation Card */}
                      {selectedSubmission.doctor.evaluationScore !== undefined && selectedSubmission.doctor.evaluationScore !== null ? (
                        <div data-pdf-block className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2.5 mt-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/60 pb-2">
                            <div className="flex items-center gap-2 font-bold text-sky-900">
                              <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
                              <span>การประเมินและให้คะแนนโดย AI:</span>
                              {selectedSubmission.doctor.aiModel && (
                                <span className="inline-flex items-center rounded-lg bg-white border border-sky-200 px-2 py-0.5 text-[11px] font-mono font-bold text-sky-700 shadow-2xs">
                                  {selectedSubmission.doctor.aiModel}
                                </span>
                              )}
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-black shadow-2xs border border-sky-200">
                              <span className="text-slate-500">คะแนน:</span>
                              <span
                                className={`text-sm ${
                                  selectedSubmission.doctor.isCorrect ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {selectedSubmission.doctor.evaluationScore}
                              </span>
                              <span className="text-slate-400">/ 10</span>
                            </div>
                          </div>

                          {selectedSubmission.doctor.aiStrengths && (
                            <div data-pdf-block className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 space-y-1 text-xs">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-amber-600" /> จุดเด่นที่ทำได้ดี:
                              </span>
                              <p className="text-amber-950 font-medium leading-relaxed pl-4">
                                {selectedSubmission.doctor.aiStrengths}
                              </p>
                            </div>
                          )}

                          {selectedSubmission.doctor.aiFeedback && (
                            <div data-pdf-block className="rounded-lg bg-white border border-sky-100 p-2.5 space-y-1 text-xs">
                              <span className="font-bold text-sky-900">
                                บทวิเคราะห์และความเห็นทางการแพทย์:
                              </span>
                              <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-line pl-1">
                                {selectedSubmission.doctor.aiFeedback}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1.5 mt-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-amber-900">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>สถานะ AI: ใช้งานไม่ได้ชั่วคราว</span>
                          </div>
                          <p className="text-amber-950 font-medium pl-6">
                            {selectedSubmission.doctor.aiFeedback ||
                              "ระบบ AI ไม่สามารถประเมินผลได้ในขณะที่แพทย์ส่งผล แต่ระบบได้ทำการบันทึกและตรวจสอบความถูกต้องของโรคเรียบร้อยแล้ว"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีการตรวจวินิจฉัยจากแพทย์</p>
                )}
              </div>

              {/* Station 5: Pharmacy Dispense */}
              <div data-pdf-block className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fuchsia-800 flex items-center gap-1.5">
                    <Pill className="h-4 w-4" /> บันทึกการจ่ายยา (เภสัชกร)
                  </h4>
                  {selectedSubmission.pharmacy && (
                    <span className="text-xs text-slate-500">
                      โดย: <strong>{selectedSubmission.pharmacy.pharmacistName}</strong> ·{" "}
                      {formatDateTime(selectedSubmission.pharmacy.createdAt)}
                    </span>
                  )}
                </div>

                {selectedSubmission.pharmacy ? (
                  selectedSubmission.pharmacy.hormoneChoiceKey ? (
                    <div className="space-y-2 text-xs">
                      {(
                        [
                          [
                            "ความผิดปกติของฮอร์โมน (A-U)",
                            selectedSubmission.pharmacy.hormoneChoiceKey,
                            selectedSubmission.pharmacy.hormoneChoiceLabel,
                            selectedSubmission.pharmacy.isHormoneCorrect,
                          ],
                          [
                            "ยา/การรักษา (ก-ธ)",
                            selectedSubmission.pharmacy.treatmentChoiceKey,
                            selectedSubmission.pharmacy.treatmentChoiceLabel,
                            selectedSubmission.pharmacy.isTreatmentCorrect,
                          ],
                        ] as const
                      ).map(([heading, choiceKey, choiceLabel, correct]) => (
                        <div
                          key={heading}
                          className={`rounded-xl border p-3 ${
                            correct === true
                              ? "border-emerald-200 bg-emerald-50/60"
                              : correct === false
                                ? "border-rose-200 bg-rose-50/60"
                                : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-bold text-slate-500">{heading}</span>
                            <span
                              className={`font-bold ${
                                correct === true
                                  ? "text-emerald-700"
                                  : correct === false
                                    ? "text-rose-600"
                                    : "text-slate-400"
                              }`}
                            >
                              {correct === true ? "ถูกต้อง" : correct === false ? "ไม่ถูกต้อง" : "ไม่มีเฉลย"}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800">
                            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-fuchsia-600 text-[10px] font-black text-white">
                              {choiceKey}
                            </span>
                            {choiceLabel}
                          </p>
                        </div>
                      ))}
                      {selectedSubmission.pharmacy.evaluationScore !== null && (
                        <div className="flex items-center justify-between rounded-xl border border-fuchsia-100 bg-white p-3 text-sm font-bold">
                          <span>คะแนนสถานีห้องยา:</span>
                          <span className="text-fuchsia-900">
                            {selectedSubmission.pharmacy.evaluationScore}/{SCORE_MAXIMUMS.pharmacist}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="rounded-xl bg-white p-3 border border-fuchsia-100">
                        <div className="flex items-center justify-between font-bold text-slate-700 border-b border-slate-100 pb-2 mb-2">
                          <span>รายการยาที่จ่าย</span>
                          <span>จำนวนเม็ด</span>
                        </div>
                        <div className="space-y-1.5">
                          {Array.isArray(selectedSubmission.pharmacy.medicines) &&
                            (selectedSubmission.pharmacy.medicines as MedicineItem[]).map((med, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="font-medium text-slate-800">
                                  {idx + 1}. {med.name}
                                </span>
                                <span className="font-bold text-fuchsia-900">
                                  {med.tabletCount} เม็ด
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
                          <span>ยอดรวมยาทั้งหมด:</span>
                          <span className="text-fuchsia-900">
                            {selectedSubmission.pharmacy.totalTablets ?? 0} เม็ด
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีการจ่ายยาจากห้องยา</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              data-pdf-ignore
              className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4"
            >
              {exportError && (
                <p className="mr-auto text-xs font-semibold text-red-600">{exportError}</p>
              )}
              <button
                type="button"
                disabled={exportingPdf}
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
