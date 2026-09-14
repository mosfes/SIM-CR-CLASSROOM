"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Search,
  UserPlus,
  Trash2,
  Edit3,
  RefreshCw,
  Upload,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Check,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentsTableSkeleton } from "@/components/admin/skeleton-loaders";
import { StudentActivityModal } from "./student-activity-modal";

interface Student {
  id: string;
  role: "STUDENT";
  studentId: string;
  name: string;
  isActive?: boolean;
  createdAt: string;
}

export function StudentsContent({
  initialStudents,
}: {
  initialStudents: Student[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentForActivity, setSelectedStudentForActivity] = useState<Student | null>(null);

  // Delete modal state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const openModal = () => {
    setNewStudentId("");
    setNewStudentName("");
    setAddError(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setNewStudentId("");
    setNewStudentName("");
    setAddError(null);
    setShowAddModal(false);
  };

  // Edit Student state
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStudentId, setEditStudentId] = useState("");
  const [editStudentName, setEditStudentName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);
  const [editStudentError, setEditStudentError] = useState<string | null>(null);

  const openEditModal = (student: Student) => {
    setStudentToEdit(student);
    setEditStudentId(student.studentId || "");
    setEditStudentName(student.name || "");
    setEditIsActive(student.isActive !== false);
    setEditStudentError(null);
  };

  const closeEditModal = () => {
    setStudentToEdit(null);
    setEditStudentId("");
    setEditStudentName("");
    setEditIsActive(true);
    setEditStudentError(null);
  };

  // Batch Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [existingStudentIds, setExistingStudentIds] = useState<Set<string>>(
    () =>
      new Set(
        initialStudents
          .map((student) => student.studentId.trim())
          .filter(Boolean)
      )
  );

  const openImportModal = () => {
    setImportText("");
    setImportMode("skip");
    setImportError(null);
    setImportSuccessMsg(null);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportText("");
    setImportError(null);
    setImportSuccessMsg(null);
  };

  const parsedStudents = useMemo(() => {
    if (!importText.trim()) return [];
    const lines = importText.split(/\r?\n/);
    const list: Array<{
      raw: string;
      studentId: string;
      name: string;
      isValid: boolean;
      isDuplicateInDb: boolean;
      isDuplicateInList: boolean;
      error?: string;
    }> = [];
    const seenPastedIds = new Set<string>();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip common table headers
      if (
        /^(เลขประจำตัว|รหัสนักเรียน|student_?id|ลำดับ|เลขที่)\b/i.test(line) &&
        /(ชื่อ|name)/i.test(line)
      ) {
        continue;
      }

      // Split by tab or comma
      let parts = line.includes("\t")
        ? line.split("\t")
        : line.includes(",")
        ? line.split(",")
        : [];

      if (parts.length === 0) {
        // Space separated fallback: match ID and Name
        const spaceMatch = line.match(/^(?:(\d{1,3})\s+)?(\d{4,})\s+(.+)$/);
        if (spaceMatch) {
          parts = [spaceMatch[2], spaceMatch[3]];
        } else {
          const firstSpace = line.indexOf(" ");
          if (firstSpace !== -1) {
            parts = [line.slice(0, firstSpace), line.slice(firstSpace + 1)];
          } else {
            parts = [line];
          }
        }
      }

      const cleanedParts = parts.map((p) => p.trim()).filter(Boolean);

      let studentId = "";
      let name = "";

      if (cleanedParts.length >= 3) {
        // Check if first token is a small sequence index (e.g. 1, 2, 3)
        if (/^\d{1,3}$/.test(cleanedParts[0]) && /^\d{4,}$/.test(cleanedParts[1])) {
          studentId = cleanedParts[1];
          name = cleanedParts.slice(2).join(" ");
        } else {
          studentId = cleanedParts[0];
          name = cleanedParts.slice(1).join(" ");
        }
      } else if (cleanedParts.length === 2) {
        studentId = cleanedParts[0];
        name = cleanedParts[1];
      } else if (cleanedParts.length === 1) {
        studentId = cleanedParts[0];
        name = "";
      }

      name = name.replace(/\s+/g, " ");

      const isDupInList = seenPastedIds.has(studentId);
      if (studentId) {
        seenPastedIds.add(studentId);
      }
      const isDupInDb = existingStudentIds.has(studentId);

      const isValid = Boolean(studentId && name);
      list.push({
        raw: line,
        studentId,
        name,
        isValid,
        isDuplicateInDb: isDupInDb,
        isDuplicateInList: isDupInList,
        error: !studentId
          ? "ไม่พบรหัสนักเรียน"
          : !name
          ? "ไม่พบชื่อ-สกุล"
          : undefined,
      });
    }

    return list;
  }, [importText, existingStudentIds]);

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const validList = parsedStudents.filter((s) => s.isValid);
    if (validList.length === 0) {
      setImportError("กรุณากรอกหรือวางข้อมูลนักเรียนที่ถูกต้องอย่างน้อย 1 คน");
      return;
    }

    try {
      setImporting(true);
      setImportError(null);

      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: validList.map((s) => ({
            studentId: s.studentId,
            name: s.name,
          })),
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }

      setImportSuccessMsg(data.message || `นำเข้าข้อมูลสำเร็จ ${data.importedCount} คน`);
      setExistingStudentIds((current) => {
        const next = new Set(current);
        validList.forEach((student) => next.add(student.studentId));
        return next;
      });
      fetchStudents();
      setTimeout(() => {
        closeImportModal();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setImportError(err.message);
      } else {
        setImportError("เกิดข้อผิดพลาดในการนำเข้า");
      }
    } finally {
      setImporting(false);
    }
  };

  const fetchStudents = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("role", "STUDENT");
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();

      if (json.success) {
        const nextStudents = (json.data || []) as Student[];
        setStudents(nextStudents);
        if (!searchQuery.trim()) {
          setExistingStudentIds(
            new Set(
              nextStudents
                .map((student) => student.studentId.trim())
                .filter(Boolean)
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      clearTimeout(timeoutId);
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
    const timer = setTimeout(
      () => {
        fetchStudents();
      },
      searchQuery.trim() ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [searchQuery, fetchStudents]);

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/admin/users/${studentToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลบนักเรียน");
      }
      setStudentToDelete(null);
      setExistingStudentIds((current) => {
        const next = new Set(current);
        next.delete(studentToDelete.studentId.trim());
        return next;
      });
      fetchStudents();
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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim()) {
      setAddError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setAdding(true);
      setAddError(null);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "STUDENT",
          studentId: newStudentId.trim(),
          name: newStudentName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      setNewStudentId("");
      setNewStudentName("");
      setShowAddModal(false);
      setExistingStudentIds((current) => new Set(current).add(newStudentId.trim()));
      fetchStudents();
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

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;

    if (!editStudentId.trim() || !editStudentName.trim()) {
      setEditStudentError("กรุณากรอกรหัสและชื่อนักเรียนให้ครบถ้วน");
      return;
    }

    try {
      setSavingStudentEdit(true);
      setEditStudentError(null);

      const res = await fetch(`/api/admin/users/${studentToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editStudentId.trim(),
          name: editStudentName.trim(),
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }

      closeEditModal();
      setExistingStudentIds((current) => {
        const next = new Set(current);
        next.delete(studentToEdit.studentId.trim());
        next.add(editStudentId.trim());
        return next;
      });
      fetchStudents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditStudentError(err.message);
      } else {
        setEditStudentError("เกิดข้อผิดพลาดในการบันทึกการแก้ไข");
      }
    } finally {
      setSavingStudentEdit(false);
    }
  };

  const toggleStudentStatus = async (student: Student) => {
    try {
      setTogglingId(student.id);
      const newStatus = student.isActive === false ? true : false;
      const res = await fetch(`/api/admin/users/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isActive: newStatus } : s))
      );
    } catch (err) {
      console.error("Error toggling student status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === "ACTIVE" && s.isActive === false) return false;
      if (statusFilter === "INACTIVE" && s.isActive !== false) return false;
      return true;
    });
  }, [students, statusFilter]);

  const getInitials = (name: string) => {
    if (!name) return "นร";
    const clean = name.replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)/, "").trim();
    return clean.slice(0, 2);
  };

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

  const totalCount = students.length;
  const activeCount = students.filter((s) => s.isActive !== false).length;
  const inactiveCount = students.filter((s) => s.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header Bar matching Screenshot */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Link href="/admin" className="hover:text-red-600 transition-colors">
              หน้าหลัก
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">จัดการนักเรียน</span>
          </nav>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            จัดการนักเรียน
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            จัดการข้อมูลนักเรียนทั้งหมดในระบบ
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openImportModal}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>นำเข้าข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm shadow-red-500/25 hover:bg-red-700 transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ เพิ่มนักเรียน</span>
          </button>
        </div>
      </div>

      {/* 3 Stat Cards Row matching screenshot */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <GraduationCap className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ทั้งหมด</p>
            {loading && students.length === 0 ? (
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
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ใช้งาน</p>
            {loading && students.length === 0 ? (
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
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-red-50 text-red-600">
            <XCircle className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ปิดใช้งาน</p>
            {loading && students.length === 0 ? (
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
              placeholder="ค้นหารหัสนักเรียน, ชื่อ..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-xs font-normal text-slate-700 focus:border-red-500 focus:outline-none"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="ACTIVE">ใช้งาน</option>
                <option value="INACTIVE">ปิดใช้งาน</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Clear Filter button if any filter is active */}
            {statusFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                title="ล้างตัวกรอง"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ล้างตัวกรอง</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchStudents()}
              disabled={loading}
              title="รีเฟรชข้อมูล"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          {loading && students.length === 0 ? (
            <StudentsTableSkeleton rows={6} />
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 mb-4">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="text-base font-medium text-slate-800">
                {students.length === 0 ? "ยังไม่มีข้อมูลนักเรียน" : "ไม่พบข้อมูลนักเรียน"}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {searchQuery
                  ? `ไม่พบนักเรียนที่ตรงกับคำค้นหา "${searchQuery}"`
                  : statusFilter !== "ALL"
                  ? "ไม่พบนักเรียนตามเงื่อนไขตัวกรองที่เลือก"
                  : "เริ่มต้นโดยการเพิ่มข้อมูลนักเรียนคนแรกเข้าสู่ระบบ"}
              </p>
              {students.length === 0 ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ เพิ่มนักเรียน</span>
                </button>
              ) : (
                (statusFilter !== "ALL" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  >
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">รหัสนักเรียน</th>
                    <th className="px-6 py-4 whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const paginatedStudents = filteredStudents.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    return paginatedStudents.map((student) => {
                      const initials = getInitials(student.name);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Student ID with Avatar Badge */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForActivity(student)}
                              className="flex items-center gap-3 text-left group cursor-pointer"
                              title="คลิกเพื่อดูประวัติและผลงาน"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-white font-medium text-xs shadow-xs shadow-rose-500/15 group-hover:scale-105 transition-transform">
                                {initials}
                              </div>
                              <span className="font-mono text-xs font-medium text-slate-900 group-hover:text-red-600 group-hover:underline transition-colors">
                                {student.studentId}
                              </span>
                            </button>
                          </td>

                          {/* Full Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForActivity(student)}
                              className="font-normal text-slate-900 hover:text-red-600 hover:underline cursor-pointer text-left transition-colors"
                              title="คลิกเพื่อดูประวัติและผลงาน"
                            >
                              {student.name}
                            </button>
                          </td>

                          {/* Status Badge Toggle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student)}
                              disabled={togglingId === student.id}
                              title="คลิกเพื่อเปลี่ยนสถานะ เปิด/ปิดใช้งาน"
                              className="cursor-pointer group focus:outline-none transition-transform active:scale-95"
                            >
                              {togglingId === student.id ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 border border-slate-200">
                                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                                  <span>กำลังเปลี่ยน...</span>
                                </span>
                              ) : student.isActive !== false ? (
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
                            {formatDate(student.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForActivity(student)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                title="ดูประวัติและผลงาน"
                              >
                                <Activity className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(student)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentToDelete(student)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="ลบนักเรียนนี้"
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
          {!loading && filteredStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-6 text-xs text-slate-500">
              <div>
                แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง{" "}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)}
                </span>{" "}
                จากทั้งหมด <span className="font-semibold text-slate-800">{filteredStudents.length.toLocaleString()}</span> รายการ
              </div>

              {Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) > 1 && (
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

                  {Array.from({ length: Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter((page) => {
                      const total = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
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
                      setCurrentPage((p) => Math.min(Math.ceil(filteredStudents.length / ITEMS_PER_PAGE), p + 1))
                    }
                    disabled={currentPage === Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)}
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

      {/* Quick Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">เพิ่มนักเรียนใหม่</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudent} autoComplete="off" className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="student_code"
                  autoComplete="off"
                  placeholder="เช่น 690000001-2"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="student_full_name"
                  autoComplete="off"
                  placeholder="เช่น สมศรี ซีพี"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={adding}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกนักเรียน</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Edit3 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลนักเรียน</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editStudentError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {editStudentError}
              </div>
            )}

            <form onSubmit={handleEditStudent} autoComplete="off" className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="edit_student_id"
                  autoComplete="off"
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="edit_student_name"
                  autoComplete="off"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10"
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
                  disabled={savingStudentEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingStudentEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {savingStudentEdit ? (
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

      {/* Batch Import Student Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">นำเข้าข้อมูลนักเรียน (Copy & Paste)</h3>
                  <p className="text-xs text-slate-500">คัดลอกจากตาราง Google Sheets หรือ Excel แล้ววางลงในช่องด้านล่าง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success Message */}
            {importSuccessMsg && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 flex items-center gap-2 shrink-0">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 shrink-0">
                {importError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleBatchImport} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วางข้อความจากตาราง Excel / Google Sheets
                </label>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`ตัวอย่าง:\n31353\tนางสาวขวัญข้าว  สว่างภพ\n31434\tนางสาวจิดาภา  แก้ววงศา\n31530\tนางสาวศิลามณี  โนวงค์`}
                  className="w-full font-mono text-xs rounded-2xl border border-slate-200 p-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/10 leading-relaxed resize-y"
                />
              </div>

              {/* Parsing Summary & Preview */}
              {parsedStudents.length > 0 && (() => {
                const newCount = parsedStudents.filter(
                  (s) => s.isValid && !s.isDuplicateInDb && !s.isDuplicateInList
                ).length;
                const dupDbCount = parsedStudents.filter(
                  (s) => s.isValid && s.isDuplicateInDb
                ).length;
                const dupListCount = parsedStudents.filter(
                  (s) => s.isValid && s.isDuplicateInList
                ).length;
                const totalDup = dupDbCount + dupListCount;

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700">
                          ตรวจพบ {parsedStudents.length} รายการ:
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <Check className="h-3 w-3" /> ข้อมูลใหม่ {newCount} คน
                        </span>
                        {totalDup > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> ข้อมูลซ้ำ {totalDup} คน
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportText("")}
                        className="text-xs text-red-500 hover:underline"
                      >
                        ล้างข้อความ
                      </button>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === "skip"}
                          onChange={() => setImportMode("skip")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>ข้ามรายการที่รหัสซ้ำ ({totalDup} คน)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === "update"}
                          onChange={() => setImportMode("update")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>อัปเดตชื่อหากพบรหัสซ้ำ ({totalDup} คน)</span>
                      </label>
                    </div>

                    {/* Preview Table */}
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/90 sticky top-0 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 whitespace-nowrap">#</th>
                            <th className="py-2 px-3 whitespace-nowrap">รหัสนักเรียน</th>
                            <th className="py-2 px-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
                            <th className="py-2 px-3 text-right whitespace-nowrap">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedStudents.map((item, index) => {
                            const isDup = item.isDuplicateInDb || item.isDuplicateInList;
                            return (
                              <tr
                                key={index}
                                className={
                                  !item.isValid
                                    ? "bg-red-50/60"
                                    : isDup
                                    ? "bg-amber-50/40 hover:bg-amber-50/70"
                                    : "hover:bg-slate-50"
                                }
                              >
                                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                                  {index + 1}
                                </td>
                                <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                                  {item.studentId || <span className="text-red-400">-</span>}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  {item.name || <span className="text-red-400">-</span>}
                                </td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                  {!item.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200">
                                      <X className="h-3 w-3" /> {item.error}
                                    </span>
                                  ) : item.isDuplicateInList ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                      <AlertTriangle className="h-3 w-3 text-amber-600" /> ซ้ำในรายการ
                                    </span>
                                  ) : item.isDuplicateInDb ? (
                                    importMode === "update" ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                        <RefreshCw className="h-3 w-3 text-rose-600" /> ซ้ำในระบบ (จะอัปเดต)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                        <AlertTriangle className="h-3 w-3 text-amber-600" /> ซ้ำในระบบ (จะข้าม)
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                      <Check className="h-3 w-3 text-emerald-600" /> พร้อมนำเข้า
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={importing}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={
                    importing ||
                    parsedStudents.filter((s) => s.isValid).length === 0 ||
                    (importMode === "skip" &&
                      parsedStudents.filter(
                        (s) => s.isValid && !s.isDuplicateInDb && !s.isDuplicateInList
                      ).length === 0)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังนำเข้า...</span>
                    </>
                  ) : (() => {
                    const newCount = parsedStudents.filter(
                      (s) => s.isValid && !s.isDuplicateInDb && !s.isDuplicateInList
                    ).length;
                    const dupCount = parsedStudents.filter(
                      (s) => s.isValid && (s.isDuplicateInDb || s.isDuplicateInList)
                    ).length;
                    if (importMode === "update") {
                      return (
                        <span>
                          นำเข้าและอัปเดตข้อมูล ({newCount} คนใหม่{dupCount > 0 ? `, ${dupCount} คนอัปเดต` : ""})
                        </span>
                      );
                    }
                    return (
                      <span>
                        นำเข้าข้อมูล ({newCount} คนใหม่{dupCount > 0 ? `, ข้าม ${dupCount} คนซ้ำ` : ""})
                      </span>
                    );
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบนักเรียน</h3>
                <p className="mt-1 text-xs text-slate-500">
                  คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ{" "}
                  <strong className="text-slate-800">{studentToDelete.name}</strong> (รหัส{" "}
                  {studentToDelete.studentId}) ออกจากระบบ?
                </p>

                {deleteError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{deleteError}</p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentToDelete(null);
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
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

      {/* Student Activity & Portfolio Modal */}
      {selectedStudentForActivity && (
        <StudentActivityModal
          key={selectedStudentForActivity.id}
          student={selectedStudentForActivity}
          onClose={() => setSelectedStudentForActivity(null)}
        />
      )}
    </div>
  );
}
