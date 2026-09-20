"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { SearchField } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Filter,
  Layers,
  RefreshCw,
  ScanSearch,
  Target,
  X,
} from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { downloadElementAsPdf } from "@/lib/pdf-export";
import { formatPatientCode } from "@/lib/patient-code";
import { CaseCard } from "./monitor/case-card";
import { DossierModal } from "./monitor/dossier-modal";
import { MonitorOverview } from "./monitor/overview";
import {
  formatTime,
  type ClassroomOption,
  type Metrics,
  type Pagination,
  type SubmissionItem,
  type SubmissionListItem,
} from "./monitor/shared";

const STAGE_OPTIONS = [
  { value: "ALL", label: "ทุกสถานะ" },
  { value: "WAITING_NURSE", label: "รอซักประวัติ" },
  { value: "WAITING_LAB", label: "รอผลแล็บ" },
  { value: "WAITING_DOCTOR", label: "รอตรวจวินิจฉัย" },
  { value: "WAITING_PHARMACY", label: "รอจ่ายยา" },
  { value: "COMPLETED", label: "เสร็จสิ้น" },
];

const EVALUATION_OPTIONS = [
  { value: "ALL", label: "ผลวินิจฉัยทั้งหมด" },
  { value: "CORRECT", label: "วินิจฉัยถูกต้อง (ตรงเฉลย)" },
  { value: "INCORRECT", label: "วินิจฉัยไม่ตรงเฉลย" },
  { value: "PENDING", label: "ยังไม่วินิจฉัย" },
  { value: "NO_KEY", label: "ไม่มีเฉลย" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 คิว" },
  { value: "20", label: "20 คิว" },
  { value: "50", label: "50 คิว" },
];

const AUTO_REFRESH_SECONDS = 10;

function CaseCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 p-5">
        <div className="h-14 w-14 rounded-2xl bg-slate-100" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-48 rounded bg-slate-100" />
          <div className="h-3 w-64 rounded bg-slate-100" />
          <div className="h-5 w-56 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-4 border-t border-slate-100 p-5 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-3 md:flex-col">
            <div className="h-8 w-8 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-3 w-28 rounded bg-slate-100" />
            </div>
          </div>
        ))}
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
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // การ์ดที่ขยายรายละเอียดสถานีอยู่
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

    let secondsLeft = AUTO_REFRESH_SECONDS;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        secondsLeft = AUTO_REFRESH_SECONDS;
        fetchSubmissions(false);
      }
      setCountdown(secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchSubmissions]);

  const handleToggleAutoRefresh = () => {
    setCountdown(AUTO_REFRESH_SECONDS);
    setAutoRefresh((prev) => !prev);
  };

  const handleManualRefresh = () => {
    setCountdown(AUTO_REFRESH_SECONDS);
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

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentPage(1);
  };

  const changeStageFilter = (value: string) => {
    setStageFilter(value);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== "" || stageFilter !== "ALL" || evalFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setStageFilter("ALL");
    setEvalFilter("ALL");
    setCurrentPage(1);
  };

  const allExpanded = submissions.length > 0 && submissions.every((sub) => expandedIds.has(sub.id));

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(submissions.map((sub) => sub.id)));
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

  const groupTabs = currentClassroom
    ? [
        { id: "ALL", label: "ทุกห้องตรวจ", count: metrics?.totalCases ?? 0 },
        ...currentClassroom.groups.map((group) => ({
          id: group.id,
          label: group.name,
          count: groupCounts[group.id] ?? 0,
        })),
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Header: ชื่อหน้า + สถานะสด + เลือกห้องเรียน/ห้องตรวจ */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm shadow-red-600/25">
              <Activity className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                ติดตามการส่งตรวจของแต่ละห้องตรวจ
                <span className="ml-1.5 text-sm font-semibold text-slate-400">(Room Monitor)</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                ดูการรับส่งคนไข้ระหว่างสถานีแบบเรียลไทม์ พร้อมเปรียบเทียบผลวินิจฉัยกับเฉลย
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              อัปเดตล่าสุด {formatTime(lastRefreshedAt.toISOString())}
            </span>

            <button
              type="button"
              onClick={handleToggleAutoRefresh}
              aria-pressed={autoRefresh}
              className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${
                autoRefresh
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {autoRefresh && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    autoRefresh ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </span>
              {autoRefresh ? (
                <>
                  อัปเดตอัตโนมัติ
                  <span className="inline-block min-w-6 text-center font-mono font-bold tabular-nums">
                    {countdown}s
                  </span>
                </>
              ) : (
                "เปิดอัปเดตอัตโนมัติ"
              )}
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-red-600" : ""}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5 sm:px-5 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-2.5 xl:shrink-0">
            <span className="shrink-0 text-xs font-semibold text-slate-500">ห้องเรียน</span>
            <AppSelect
              size="filter"
              className="w-full min-w-0 xl:w-72"
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

          {currentClassroom && (
            <>
              <span aria-hidden className="hidden h-6 w-px bg-slate-200 xl:block" />
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-slate-500 sm:flex">
                  <Layers className="h-3.5 w-3.5" />
                  ห้องตรวจ
                </span>
                <div
                  role="tablist"
                  aria-label="เลือกห้องตรวจ"
                  className="flex min-w-0 flex-1 flex-wrap gap-1.5"
                >
                  {groupTabs.map((tab) => {
                    const selected = selectedGroupId === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => selectGroup(tab.id)}
                        className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? "border-red-600 bg-red-600 text-white shadow-sm shadow-red-600/25"
                            : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-700"
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`min-w-5 rounded-md px-1 text-center text-[11px] font-bold tabular-nums ${
                            selected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ภาพรวมสถานะคิว */}
      {metrics && (
        <MonitorOverview metrics={metrics} stageFilter={stageFilter} onStageChange={changeStageFilter} />
      )}

      {/* ค้นหา & ตัวกรอง */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchField
          aria-label="ค้นหาผู้ป่วย"
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          className="w-full xl:w-80"
        >
          <SearchField.Group className="h-10 rounded-xl border border-slate-200 bg-white shadow-none data-[focus-within=true]:border-red-400 data-[focus-within=true]:ring-4 data-[focus-within=true]:ring-red-100">
            <SearchField.SearchIcon />
            <SearchField.Input className="text-xs" placeholder="ค้นหาชื่อผู้ป่วย, รหัสผู้ป่วย, โรค..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="flex flex-wrap items-center gap-2">
          <AppSelect
            size="filter"
            className="w-44"
            ariaLabel="กรองตามสถานะ"
            icon={<Filter className="h-3.5 w-3.5" />}
            options={STAGE_OPTIONS}
            value={stageFilter}
            onChange={changeStageFilter}
          />
          <AppSelect
            size="filter"
            className="w-60"
            ariaLabel="กรองตามผลวินิจฉัย"
            icon={<Target className="h-3.5 w-3.5" />}
            options={EVALUATION_OPTIONS}
            value={evalFilter}
            onChange={(value) => {
              setEvalFilter(value);
              setCurrentPage(1);
            }}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 xl:ml-auto">
          <span className="text-xs text-slate-500">
            พบ <span className="font-bold text-slate-800">{pagination.total.toLocaleString()}</span> คิว
          </span>
          {submissions.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {allExpanded ? (
                <ChevronsDownUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5" />
              )}
              {allExpanded ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}
            </button>
          )}
        </div>
      </div>

      {detailError && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {detailError}
        </p>
      )}

      {/* รายการคิว */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
          <p className="text-sm font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setCountdown(AUTO_REFRESH_SECONDS);
              fetchSubmissions(true);
            }}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : loading && submissions.length === 0 ? (
        <div className="space-y-4" aria-busy="true" aria-label="กำลังโหลดข้อมูลการส่งตรวจ">
          <CaseCardSkeleton />
          <CaseCardSkeleton />
          <CaseCardSkeleton />
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            {hasActiveFilters ? <ScanSearch className="h-7 w-7" /> : <Activity className="h-7 w-7" />}
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {hasActiveFilters ? "ไม่พบคิวที่ตรงกับตัวกรอง" : "ยังไม่มีข้อมูลการส่งตรวจ"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {hasActiveFilters
              ? "ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูคิวทั้งหมด"
              : "เมื่อนักเรียนเริ่มออกบัตรผู้ป่วยและส่งต่อในแต่ละห้องตรวจ ข้อมูลจะปรากฏที่นี่แบบเรียลไทม์"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : (
        <div
          className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}
          aria-busy={loading}
        >
          {submissions.map((sub) => (
            <CaseCard
              key={sub.id}
              sub={sub}
              expanded={expandedIds.has(sub.id)}
              onToggle={() => toggleExpanded(sub.id)}
              onOpen={() => void handleOpenSubmission(sub.id)}
              opening={detailLoadingId === sub.id}
              openingDisabled={detailLoadingId !== null}
            />
          ))}

          {/* Pagination Bar */}
          {pagination.total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs sm:flex-row sm:px-5">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <span>
                  แสดง{" "}
                  <span className="font-semibold text-slate-800">
                    {(activePage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  ถึง{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(activePage * itemsPerPage, pagination.total)}
                  </span>{" "}
                  จากทั้งหมด{" "}
                  <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> คิว
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-500">แสดงหน้าละ</span>
                  <AppSelect
                    size="compact"
                    className="w-28"
                    ariaLabel="จำนวนคิวต่อหน้า"
                    options={PAGE_SIZE_OPTIONS}
                    value={String(itemsPerPage)}
                    onChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {totalPages > 1 && (
                <nav aria-label="เลือกหน้า" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {visiblePages.map((page, idx, array) => {
                    const prevPage = array[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                      <div key={page} className="flex items-center gap-1.5">
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          aria-current={activePage === page ? "page" : undefined}
                          className={`flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-xl px-2.5 text-xs font-bold transition-colors ${
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
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      )}

      {selectedSubmission && (
        <DossierModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onExport={handleExportPdf}
          exportingPdf={exportingPdf}
          exportError={exportError}
        />
      )}
    </div>
  );
}
