"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  FlaskConical,
  FileDown,
  HeartPulse,
} from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import { DiseasesTableSkeleton } from "@/components/admin/skeleton-loaders";
import {
  DiseaseLabResultsEditor,
  DiseaseLabResultsTable,
  DiseaseNurseChoicesEditor,
  DiseasePharmacyChoicesEditor,
  emptyLabResultRow,
} from "@/components/admin/disease-lab-results-editor";
import { DiseasePrintModal } from "@/components/admin/disease-print-modal";
import { NurseDecoyModal } from "@/components/admin/nurse-decoy-modal";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";
import { buildNurseChoiceOptions } from "@/lib/nurse-choices";

interface Disease {
  id: string;
  code: string;
  name: string;
  symptoms: string;
  labResults?: DiseaseLabResult[] | null;
  hormoneChoiceKey?: string | null;
  hormoneChoiceLabel?: string | null;
  treatmentChoiceKey?: string | null;
  treatmentChoiceLabel?: string | null;
  endocrineGland?: string | null;
  abnormalHormone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SORT_OPTIONS = [
  { value: "CREATED_DESC", label: "วันที่เพิ่ม: ใหม่ → เก่า" },
  { value: "CREATED_ASC", label: "วันที่เพิ่ม: เก่า → ใหม่" },
  { value: "CODE_ASC", label: "รหัสโรค: น้อย → มาก" },
  { value: "CODE_DESC", label: "รหัสโรค: มาก → น้อย" },
  { value: "NAME_ASC", label: "ชื่อโรค: ก → ฮ" },
  { value: "NAME_DESC", label: "ชื่อโรค: ฮ → ก" },
  { value: "LAB_DESC", label: "ผลตรวจ: มาก → น้อย" },
  { value: "LAB_ASC", label: "ผลตรวจ: น้อย → มาก" },
] as const;

const blankLabRows = (): DiseaseLabResult[] => [{ ...emptyLabResultRow }];

const labRowsOf = (disease: Disease): DiseaseLabResult[] =>
  Array.isArray(disease.labResults) ? disease.labResults : [];

export function DiseasesContent({ initialDiseases }: { initialDiseases: Disease[] }) {
  const [diseases, setDiseases] = useState<Disease[]>(initialDiseases);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState<string>("CREATED_DESC");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal state
  const [diseaseToDelete, setDiseaseToDelete] = useState<Disease | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add Disease Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymptoms, setNewSymptoms] = useState("");
  const [newLabResults, setNewLabResults] = useState<DiseaseLabResult[]>(blankLabRows);
  const [newHormoneKey, setNewHormoneKey] = useState("");
  const [newHormoneLabel, setNewHormoneLabel] = useState("");
  const [newTreatmentKey, setNewTreatmentKey] = useState("");
  const [newTreatmentLabel, setNewTreatmentLabel] = useState("");
  const [newGland, setNewGland] = useState("");
  const [newAbnormalHormone, setNewAbnormalHormone] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Disease Modal state
  const [diseaseToEdit, setDiseaseToEdit] = useState<Disease | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editLabResults, setEditLabResults] = useState<DiseaseLabResult[]>(blankLabRows);
  const [editHormoneKey, setEditHormoneKey] = useState("");
  const [editHormoneLabel, setEditHormoneLabel] = useState("");
  const [editTreatmentKey, setEditTreatmentKey] = useState("");
  const [editTreatmentLabel, setEditTreatmentLabel] = useState("");
  const [editGland, setEditGland] = useState("");
  const [editAbnormalHormone, setEditAbnormalHormone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Lab results viewer state
  const [diseaseToView, setDiseaseToView] = useState<Disease | null>(null);

  // Print / export state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDecoyModal, setShowDecoyModal] = useState(false);

  // ข้อความต่อมไร้ท่อ/ฮอร์โมนที่โรคอื่นใช้อยู่แล้ว ไว้แนะนำตอนกรอก (รายการเริ่มต้นไม่ถูกกรอง)
  const nurseChoiceSuggestions = useMemo(
    () => {
      const options = buildNurseChoiceOptions([...initialDiseases, ...diseases]);
      return { glands: options.glands, hormones: options.hormones };
    },
    [initialDiseases, diseases]
  );

  const resetAddForm = () => {
    setNewCode("");
    setNewName("");
    setNewSymptoms("");
    setNewLabResults(blankLabRows());
    setNewHormoneKey("");
    setNewHormoneLabel("");
    setNewTreatmentKey("");
    setNewTreatmentLabel("");
    setNewGland("");
    setNewAbnormalHormone("");
    setAddError(null);
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    resetAddForm();
    setShowAddModal(false);
  };

  const openEditModal = (disease: Disease) => {
    const rows = labRowsOf(disease);
    setDiseaseToEdit(disease);
    setEditCode(disease.code);
    setEditName(disease.name);
    setEditSymptoms(disease.symptoms || "");
    setEditLabResults(rows.length > 0 ? rows.map((row) => ({ ...row })) : blankLabRows());
    setEditHormoneKey(disease.hormoneChoiceKey || "");
    setEditHormoneLabel(disease.hormoneChoiceLabel || "");
    setEditTreatmentKey(disease.treatmentChoiceKey || "");
    setEditTreatmentLabel(disease.treatmentChoiceLabel || "");
    setEditGland(disease.endocrineGland || "");
    setEditAbnormalHormone(disease.abnormalHormone || "");
    setEditIsActive(disease.isActive !== false);
    setEditError(null);
  };

  const closeEditModal = () => {
    setDiseaseToEdit(null);
    setEditCode("");
    setEditName("");
    setEditSymptoms("");
    setEditLabResults(blankLabRows());
    setEditHormoneKey("");
    setEditHormoneLabel("");
    setEditTreatmentKey("");
    setEditTreatmentLabel("");
    setEditGland("");
    setEditAbnormalHormone("");
    setEditIsActive(true);
    setEditError(null);
  };

  const fetchDiseases = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const res = await fetch(`/api/admin/diseases?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDiseases(json.data);
      }
    } catch (err) {
      console.error("Failed to load diseases:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // SSR already provided the default (unfiltered) list — skip the redundant
  // fetch on first mount when the search filter is still at that default.
  const skipInitialFetch = useRef(!searchQuery.trim());

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchDiseases();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchDiseases]);

  const handleAddDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newSymptoms.trim()) {
      setAddError("กรุณากรอกรหัสโรค ชื่อโรค และอาการให้ครบถ้วน");
      return;
    }

    try {
      setAdding(true);
      setAddError(null);
      const res = await fetch("/api/admin/diseases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          symptoms: newSymptoms.trim(),
          labResults: newLabResults,
          hormoneChoiceKey: newHormoneKey.trim(),
          hormoneChoiceLabel: newHormoneLabel.trim(),
          treatmentChoiceKey: newTreatmentKey.trim(),
          treatmentChoiceLabel: newTreatmentLabel.trim(),
          endocrineGland: newGland.trim(),
          abnormalHormone: newAbnormalHormone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูลโรค");
      }

      closeAddModal();
      fetchDiseases();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAddError(err.message);
      } else {
        setAddError("เกิดข้อผิดพลาดในการบันทึก");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleEditDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseToEdit) return;

    if (!editCode.trim() || !editName.trim() || !editSymptoms.trim()) {
      setEditError("กรุณากรอกรหัสโรค ชื่อโรค และอาการให้ครบถ้วน");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await fetch(`/api/admin/diseases/${diseaseToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCode.trim(),
          name: editName.trim(),
          symptoms: editSymptoms.trim(),
          labResults: editLabResults,
          hormoneChoiceKey: editHormoneKey.trim(),
          hormoneChoiceLabel: editHormoneLabel.trim(),
          treatmentChoiceKey: editTreatmentKey.trim(),
          treatmentChoiceLabel: editTreatmentLabel.trim(),
          endocrineGland: editGland.trim(),
          abnormalHormone: editAbnormalHormone.trim(),
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูลโรค");
      }

      closeEditModal();
      fetchDiseases();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("เกิดข้อผิดพลาดในการบันทึกการแก้ไข");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleDiseaseStatus = async (disease: Disease) => {
    try {
      setTogglingId(disease.id);
      const newStatus = disease.isActive === false ? true : false;
      const res = await fetch(`/api/admin/diseases/${disease.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      }
      setDiseases((prev) =>
        prev.map((d) => (d.id === disease.id ? { ...d, isActive: newStatus } : d))
      );
    } catch (err) {
      console.error("Error toggling disease status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteDisease = async () => {
    if (!diseaseToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/admin/diseases/${diseaseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลบข้อมูลโรค");
      }
      setDiseaseToDelete(null);
      fetchDiseases();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredDiseases = useMemo(() => {
    const visible = diseases.filter((d) => {
      if (statusFilter === "ACTIVE") return d.isActive !== false;
      if (statusFilter === "INACTIVE") return d.isActive === false;
      return true;
    });

    const byText = (a: string, b: string) =>
      a.localeCompare(b, "th", { numeric: true, sensitivity: "base" });
    const byTime = (a: string, b: string) =>
      new Date(a).getTime() - new Date(b).getTime();

    return [...visible].sort((a, b) => {
      switch (sortOption) {
        case "CODE_ASC":
          return byText(a.code, b.code);
        case "CODE_DESC":
          return byText(b.code, a.code);
        case "NAME_ASC":
          return byText(a.name, b.name);
        case "NAME_DESC":
          return byText(b.name, a.name);
        case "LAB_ASC":
          return labRowsOf(a).length - labRowsOf(b).length || byText(a.code, b.code);
        case "LAB_DESC":
          return labRowsOf(b).length - labRowsOf(a).length || byText(a.code, b.code);
        case "CREATED_ASC":
          return byTime(a.createdAt, b.createdAt) || byText(a.code, b.code);
        case "CREATED_DESC":
        default:
          return byTime(b.createdAt, a.createdAt) || byText(a.code, b.code);
      }
    });
  }, [diseases, statusFilter, sortOption]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const totalCount = diseases.length;
  const activeCount = diseases.filter((d) => d.isActive !== false).length;
  const inactiveCount = diseases.filter((d) => d.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Link href="/admin" className="hover:text-red-600 transition-colors">
              หน้าหลัก
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">จัดการโรค</span>
          </nav>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            จัดการข้อมูลโรค
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            จัดการรหัสโรค ชื่อโรค อาการ และผลตรวจทางห้องปฏิบัติการของโรคทั้งหมดในระบบ
          </p>
        </div>

        {/* Action Button Top Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            title="ส่งออกบัตรโรคเป็นไฟล์ PDF ขนาด A4"
          >
            <FileDown className="h-4 w-4" />
            <span>ส่งออกบัตรโรค PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDecoyModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            title="ตัวเลือกต่อมไร้ท่อ/ฮอร์โมนที่ไม่ใช่คำตอบของโรคใด ไว้หลอกในสถานีพยาบาล"
          >
            <HeartPulse className="h-4 w-4" />
            <span>ตัวลวงสถานีพยาบาล</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm shadow-red-500/25 hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ เพิ่มโรค</span>
          </button>
        </div>
      </div>

      {/* 3 Stat Cards Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600">
            <Activity className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">โรคทั้งหมด</p>
            {loading && diseases.length === 0 ? (
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg mt-0.5" />
            ) : (
              <p className="text-lg sm:text-3xl font-medium text-slate-900 tracking-tight sm:mt-0.5">
                {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Active Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">เปิดใช้งาน</p>
            {loading && diseases.length === 0 ? (
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg mt-0.5" />
            ) : (
              <p className="text-lg sm:text-3xl font-medium text-slate-900 tracking-tight sm:mt-0.5">
                {activeCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Inactive Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500">
            <XCircle className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ปิดใช้งาน</p>
            {loading && diseases.length === 0 ? (
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg mt-0.5" />
            ) : (
              <p className="text-lg sm:text-3xl font-medium text-slate-900 tracking-tight sm:mt-0.5">
                {inactiveCount}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหารหัสโรค, ชื่อโรค, อาการ..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AppSelect
              size="filter"
              rounded="2xl"
              className="w-56"
              ariaLabel="เลือกวิธีเรียงลำดับ"
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              options={SORT_OPTIONS}
              value={sortOption}
              onChange={(value) => {
                setSortOption(value);
                setCurrentPage(1);
              }}
            />

            <AppSelect
              size="filter"
              rounded="2xl"
              className="w-40"
              ariaLabel="กรองตามสถานะ"
              options={[
                { value: "ALL", label: "ทุกสถานะ" },
                { value: "ACTIVE", label: "เปิดใช้งาน" },
                { value: "INACTIVE", label: "ปิดใช้งาน" },
              ]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            />

            <button
              type="button"
              onClick={() => fetchDiseases()}
              disabled={loading}
              title="รีเฟรชข้อมูล"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          {loading && diseases.length === 0 ? (
            <DiseasesTableSkeleton rows={5} />
          ) : diseases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 mb-4">
                <Activity className="h-8 w-8" />
              </div>
              <h3 className="text-base font-medium text-slate-800">ยังไม่มีข้อมูลโรค</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {searchQuery
                  ? `ไม่พบข้อมูลโรคที่ตรงกับคำค้นหา "${searchQuery}"`
                  : "เริ่มต้นโดยการเพิ่มข้อมูลโรคแรกเข้าสู่ระบบ"}
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ เพิ่มโรค</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">รหัสโรค</th>
                    <th className="px-6 py-4 whitespace-nowrap">ชื่อโรค</th>
                    <th className="px-6 py-4">อาการ</th>
                    <th className="px-6 py-4 whitespace-nowrap">ผลตรวจ (Lab)</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันที่เพิ่ม</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const paginatedDiseases = filteredDiseases.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    return paginatedDiseases.map((disease) => {
                      return (
                        <tr key={disease.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Disease Code */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center font-mono text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/70 px-2.5 py-1 rounded-lg">
                              {disease.code}
                            </span>
                          </td>

                          {/* Disease Name */}
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            {disease.name}
                          </td>

                          {/* Symptoms */}
                          <td className="px-6 py-4 text-xs text-slate-600 max-w-xs sm:max-w-md">
                            <p className="line-clamp-2 leading-relaxed" title={disease.symptoms}>
                              {disease.symptoms}
                            </p>
                          </td>

                          {/* Lab Results */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {labRowsOf(disease).length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setDiseaseToView(disease)}
                                title="ดูผลตรวจทางห้องปฏิบัติการ"
                                className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-normal text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                <span>{labRowsOf(disease).length} รายการ</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status Badge Toggle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleDiseaseStatus(disease)}
                              disabled={togglingId === disease.id}
                              title="คลิกเพื่อเปลี่ยนสถานะ เปิด/ปิดใช้งาน"
                              className="cursor-pointer group focus:outline-none transition-transform active:scale-95"
                            >
                              {togglingId === disease.id ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 border border-slate-200">
                                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                                  <span>กำลังเปลี่ยน...</span>
                                </span>
                              ) : disease.isActive !== false ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-normal text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 transition-colors shadow-xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <span>เปิดใช้งาน</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 border border-slate-200 group-hover:bg-slate-200 transition-colors">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <span>ปิดใช้งาน</span>
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Created Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {formatDate(disease.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(disease)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                title="แก้ไขข้อมูลโรค"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDiseaseToDelete(disease)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="ลบข้อมูลโรคนี้"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && filteredDiseases.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-6 text-xs text-slate-500">
              <div>
                แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง{" "}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredDiseases.length)}
                </span>{" "}
                จากทั้งหมด <span className="font-semibold text-slate-800">{filteredDiseases.length.toLocaleString()}</span> รายการ
              </div>

              {Math.ceil(filteredDiseases.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: Math.ceil(filteredDiseases.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter((page) => {
                      const total = Math.ceil(filteredDiseases.length / ITEMS_PER_PAGE);
                      return page === 1 || page === total || Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, idx, array) => {
                      const prevPage = array[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <div key={page} className="flex items-center gap-1.5">
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`flex h-8 min-w-8 px-2.5 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              currentPage === page
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(Math.ceil(filteredDiseases.length / ITEMS_PER_PAGE), p + 1))
                    }
                    disabled={currentPage === Math.ceil(filteredDiseases.length / ITEMS_PER_PAGE)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Disease Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">เพิ่มข้อมูลโรคใหม่</h3>
                  <p className="text-xs text-slate-500">กรอกรหัสโรค ชื่อโรค อาการ และผลตรวจทางห้องปฏิบัติการ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddDisease} autoComplete="off" className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสโรค <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="disease_code"
                  autoComplete="off"
                  placeholder="เช่น D001, FLU-01, COVID-19"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโรค <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="disease_name"
                  autoComplete="off"
                  placeholder="เช่น ไข้หวัดใหญ่, โรคตาแดง, โรคมือเท้าปาก"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อาการ <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  name="disease_symptoms"
                  autoComplete="off"
                  placeholder="ระบุอาการของโรค เช่น มีไข้สูง หนาวสั่น ปวดศีรษะ ปวดเมื่อยตามตัว มีน้ำมูก ไอ เจ็บคอ"
                  value={newSymptoms}
                  onChange={(e) => setNewSymptoms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ผลตรวจทางห้องปฏิบัติการ
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  ระบุรายการตรวจ ผลตรวจ และค่าอ้างอิง เช่น Total calcium / 7.0 mg/dL ↓ / 8.5–10.5
                </p>
                <DiseaseLabResultsEditor
                  namePrefix="disease"
                  rows={newLabResults}
                  onChange={setNewLabResults}
                  disabled={adding}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตัวเลือกของสถานีห้องยา (เภสัชกร)
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  เฉลยที่เภสัชกรต้องเลือกให้ถูกสำหรับโรคนี้ · ถูก 1 ข้อ = 2 คะแนน, ถูกทั้ง 2 ข้อ = 3 คะแนน
                  · เว้นว่างทั้งหมดได้ถ้าโรคนี้ยังไม่ใช้ในสถานีห้องยา
                </p>
                <DiseasePharmacyChoicesEditor
                  namePrefix="disease"
                  hormoneKey={newHormoneKey}
                  hormoneLabel={newHormoneLabel}
                  treatmentKey={newTreatmentKey}
                  treatmentLabel={newTreatmentLabel}
                  disabled={adding}
                  onChange={(field, value) => {
                    if (field === "hormoneKey") setNewHormoneKey(value);
                    else if (field === "hormoneLabel") setNewHormoneLabel(value);
                    else if (field === "treatmentKey") setNewTreatmentKey(value);
                    else setNewTreatmentLabel(value);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เฉลยสถานีพยาบาล
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  ต่อมไร้ท่อและฮอร์โมนที่ผิดปกติของโรคนี้ · ต้องถูกทั้ง 2 ช่องจึงได้ 1 คะแนน
                  · หลายโรคใช้ข้อความเดียวกันได้ ให้เลือกจากรายการแนะนำเพื่อไม่ให้ตัวเลือกซ้ำ
                  · เว้นว่างได้ถ้าโรคนี้ยังไม่ใช้ในสถานีพยาบาล
                </p>
                <DiseaseNurseChoicesEditor
                  namePrefix="disease"
                  gland={newGland}
                  hormone={newAbnormalHormone}
                  glandSuggestions={nurseChoiceSuggestions.glands}
                  hormoneSuggestions={nurseChoiceSuggestions.hormones}
                  disabled={adding}
                  onChange={(field, value) => {
                    if (field === "gland") setNewGland(value);
                    else setNewAbnormalHormone(value);
                  }}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={adding}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {adding ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกข้อมูล</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Disease Modal */}
      {diseaseToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลโรค</h3>
                  <p className="text-xs text-slate-500">แก้ไขรหัสโรค ชื่อโรค อาการ ผลตรวจ และสถานะ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditDisease} autoComplete="off" className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสโรค <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="edit_disease_code"
                  autoComplete="off"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโรค <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="edit_disease_name"
                  autoComplete="off"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อาการ <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  name="edit_disease_symptoms"
                  autoComplete="off"
                  value={editSymptoms}
                  onChange={(e) => setEditSymptoms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ผลตรวจทางห้องปฏิบัติการ
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  ระบุรายการตรวจ ผลตรวจ และค่าอ้างอิง เช่น Total calcium / 7.0 mg/dL ↓ / 8.5–10.5
                </p>
                <DiseaseLabResultsEditor
                  namePrefix="edit_disease"
                  rows={editLabResults}
                  onChange={setEditLabResults}
                  disabled={savingEdit}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตัวเลือกของสถานีห้องยา (เภสัชกร)
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  เฉลยที่เภสัชกรต้องเลือกให้ถูกสำหรับโรคนี้ · ถูก 1 ข้อ = 2 คะแนน, ถูกทั้ง 2 ข้อ = 3 คะแนน
                  · เว้นว่างทั้งหมดได้ถ้าโรคนี้ยังไม่ใช้ในสถานีห้องยา
                </p>
                <DiseasePharmacyChoicesEditor
                  namePrefix="edit_disease"
                  hormoneKey={editHormoneKey}
                  hormoneLabel={editHormoneLabel}
                  treatmentKey={editTreatmentKey}
                  treatmentLabel={editTreatmentLabel}
                  disabled={savingEdit}
                  onChange={(field, value) => {
                    if (field === "hormoneKey") setEditHormoneKey(value);
                    else if (field === "hormoneLabel") setEditHormoneLabel(value);
                    else if (field === "treatmentKey") setEditTreatmentKey(value);
                    else setEditTreatmentLabel(value);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เฉลยสถานีพยาบาล
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  ต่อมไร้ท่อและฮอร์โมนที่ผิดปกติของโรคนี้ · ต้องถูกทั้ง 2 ช่องจึงได้ 1 คะแนน
                  · หลายโรคใช้ข้อความเดียวกันได้ ให้เลือกจากรายการแนะนำเพื่อไม่ให้ตัวเลือกซ้ำ
                  · เว้นว่างได้ถ้าโรคนี้ยังไม่ใช้ในสถานีพยาบาล
                </p>
                <DiseaseNurseChoicesEditor
                  namePrefix="edit_disease"
                  gland={editGland}
                  hormone={editAbnormalHormone}
                  glandSuggestions={nurseChoiceSuggestions.glands}
                  hormoneSuggestions={nurseChoiceSuggestions.hormones}
                  disabled={savingEdit}
                  onChange={(field, value) => {
                    if (field === "gland") setEditGland(value);
                    else setEditAbnormalHormone(value);
                  }}
                />
              </div>

              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  สถานะการใช้งาน
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium border transition-all cursor-pointer ${
                      editIsActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>เปิดใช้งาน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(false)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-medium border transition-all cursor-pointer ${
                      !editIsActive
                        ? "bg-slate-100 border-slate-300 text-slate-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>ปิดใช้งาน</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกการแก้ไข</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print / PDF Modal */}
      {showDecoyModal && <NurseDecoyModal onClose={() => setShowDecoyModal(false)} />}

      {showPrintModal && (
        <DiseasePrintModal
          diseases={filteredDiseases}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Lab Results Viewer Modal */}
      {diseaseToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ผลตรวจทางห้องปฏิบัติการ</h3>
                  <p className="text-xs text-slate-500">
                    <span className="font-mono">{diseaseToView.code}</span> — {diseaseToView.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiseaseToView(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <DiseaseLabResultsTable rows={labRowsOf(diseaseToView)} />
            </div>

            {/* เฉลยของสถานีพยาบาล — เห็นเฉพาะครู ไม่ถูกพิมพ์ลงบัตรผู้ป่วย */}
            {(diseaseToView.endocrineGland || diseaseToView.abnormalHormone) && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  เฉลยสถานีพยาบาล
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-white p-2.5">
                    <span className="mb-0.5 block text-[10px] font-semibold text-slate-500">ต่อมไร้ท่อที่ผิดปกติ</span>
                    <span className="font-medium text-slate-800">{diseaseToView.endocrineGland || "—"}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5">
                    <span className="mb-0.5 block text-[10px] font-semibold text-slate-500">ฮอร์โมนที่ผิดปกติ</span>
                    <span className="font-medium text-slate-800">{diseaseToView.abnormalHormone || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* เฉลยของสถานีห้องยา — เห็นเฉพาะครู ไม่ถูกพิมพ์ลงบัตรผู้ป่วย */}
            {diseaseToView.hormoneChoiceKey && diseaseToView.treatmentChoiceKey && (
              <div className="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-fuchsia-800">
                  เฉลยสถานีห้องยา (เภสัชกร)
                </p>
                <div className="space-y-2 text-xs">
                  {[
                    ["ความผิดปกติของฮอร์โมน", diseaseToView.hormoneChoiceKey, diseaseToView.hormoneChoiceLabel],
                    ["ยา/การรักษา", diseaseToView.treatmentChoiceKey, diseaseToView.treatmentChoiceLabel],
                  ].map(([heading, choiceKey, choiceLabel]) => (
                    <div key={heading} className="rounded-lg bg-white p-2.5">
                      <span className="mb-0.5 block text-[10px] font-semibold text-slate-500">{heading}</span>
                      <span className="font-medium text-slate-800">
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-fuchsia-600 text-[10px] font-black text-white">
                          {choiceKey}
                        </span>
                        {choiceLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDiseaseToView(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  const disease = diseaseToView;
                  setDiseaseToView(null);
                  openEditModal(disease);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>แก้ไขผลตรวจ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {diseaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบข้อมูลโรค</h3>
                <p className="mt-1 text-xs text-slate-500">
                  คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลโรค{" "}
                  <strong className="text-slate-800">{diseaseToDelete.name}</strong> (รหัส{" "}
                  <span className="font-mono">{diseaseToDelete.code}</span>) ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>

                {deleteError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{deleteError}</p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDiseaseToDelete(null);
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteDisease}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>กำลังลบ...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>ยืนยันการลบ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
