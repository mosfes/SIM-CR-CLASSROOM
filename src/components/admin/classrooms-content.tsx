"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  School,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassroomsGridSkeleton } from "@/components/admin/skeleton-loaders";
import {
  DEFAULT_SIMULATION_GROUP_COUNT,
  MAX_CLASSROOM_GROUP_COUNT,
  parseClassroomGroupCount,
} from "@/lib/simulation-groups";

interface Classroom {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  groupCount: number;
  createdAt: string;
  updatedAt: string;
}

export function ClassroomsContent({
  initialClassrooms,
}: {
  initialClassrooms: Classroom[];
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Classroom Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomGroupCount, setNewRoomGroupCount] = useState(String(DEFAULT_SIMULATION_GROUP_COUNT));
  const [addingRoom, setAddingRoom] = useState(false);
  const [addRoomError, setAddRoomError] = useState<string | null>(null);

  // Edit Classroom Modal
  const [roomToEdit, setRoomToEdit] = useState<Classroom | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomDescription, setEditRoomDescription] = useState("");
  const [editRoomGroupCount, setEditRoomGroupCount] = useState("");
  const [editRoomIsActive, setEditRoomIsActive] = useState(true);
  const [savingEditRoom, setSavingEditRoom] = useState(false);
  const [editRoomError, setEditRoomError] = useState<string | null>(null);

  // Delete Classroom Modal
  const [roomToDelete, setRoomToDelete] = useState<Classroom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [deleteRoomError, setDeleteRoomError] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/admin/classrooms?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setClassrooms(json.data);
      }
    } catch (err) {
      console.error("Failed to load classrooms:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // SSR already provided the default (unfiltered) list — skip the redundant
  // fetch on first mount when both filters are still at that default.
  const skipInitialFetch = useRef(!searchQuery.trim() && statusFilter === "ALL");

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchClassrooms();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchClassrooms]);

  // Calculations for stats
  const totalCount = classrooms.length;
  const activeCount = useMemo(
    () => classrooms.filter((c) => c.isActive !== false).length,
    [classrooms]
  );

  // Filtering for current client view
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((item) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive !== false) ||
        (statusFilter === "INACTIVE" && item.isActive === false);

      return matchSearch && matchStatus;
    });
  }, [classrooms, searchQuery, statusFilter]);

  // Open Classroom Modals
  const openAddModal = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomGroupCount(String(DEFAULT_SIMULATION_GROUP_COUNT));
    setAddRoomError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomGroupCount(String(DEFAULT_SIMULATION_GROUP_COUNT));
    setAddRoomError(null);
  };

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setAddRoomError("กรุณาระบุชื่อห้องเรียน");
      return;
    }

    const groupCount = parseClassroomGroupCount(Number(newRoomGroupCount));
    if (groupCount === null) {
      setAddRoomError(`จำนวนกลุ่มต้องเป็นจำนวนเต็มระหว่าง 1 ถึง ${MAX_CLASSROOM_GROUP_COUNT} กลุ่ม`);
      return;
    }

    try {
      setAddingRoom(true);
      setAddRoomError(null);

      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || undefined,
          groupCount,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการสร้างห้องเรียน");
      }

      closeAddModal();
      await fetchClassrooms();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAddRoomError(err.message);
      } else {
        setAddRoomError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      }
    } finally {
      setAddingRoom(false);
    }
  };

  // Edit Classroom
  const openEditModal = (e: React.MouseEvent, room: Classroom) => {
    e.stopPropagation();
    setRoomToEdit(room);
    setEditRoomName(room.name);
    setEditRoomDescription(room.description || "");
    setEditRoomGroupCount(String(room.groupCount));
    setEditRoomIsActive(room.isActive !== false);
    setEditRoomError(null);
  };

  const closeEditModal = () => {
    setRoomToEdit(null);
    setEditRoomError(null);
  };

  const handleSaveEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomToEdit) return;

    if (!editRoomName.trim()) {
      setEditRoomError("กรุณาระบุชื่อห้องเรียน");
      return;
    }

    const groupCount = parseClassroomGroupCount(Number(editRoomGroupCount));
    if (groupCount === null) {
      setEditRoomError(`จำนวนกลุ่มต้องเป็นจำนวนเต็มระหว่าง 1 ถึง ${MAX_CLASSROOM_GROUP_COUNT} กลุ่ม`);
      return;
    }

    try {
      setSavingEditRoom(true);
      setEditRoomError(null);

      const res = await fetch(`/api/admin/classrooms/${roomToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editRoomName.trim(),
          description: editRoomDescription.trim() || null,
          groupCount,
          isActive: editRoomIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการแก้ไขห้องเรียน");
      }

      setClassrooms((prev) =>
        prev.map((c) => (c.id === roomToEdit.id ? { ...c, ...json.data } : c))
      );
      closeEditModal();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditRoomError(err.message);
      } else {
        setEditRoomError("เกิดข้อผิดพลาดในการแก้ไข");
      }
    } finally {
      setSavingEditRoom(false);
    }
  };

  // Toggle Classroom status
  const toggleRoomStatus = async (e: React.MouseEvent, room: Classroom) => {
    e.stopPropagation();
    try {
      setTogglingId(room.id);
      const newStatus = room.isActive === false;
      const res = await fetch(`/api/admin/classrooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "ไม่สามารถเปลี่ยนสถานะได้");
      }
      setClassrooms((prev) =>
        prev.map((c) => (c.id === room.id ? { ...c, isActive: newStatus } : c))
      );
    } catch (err) {
      console.error("Error toggling classroom status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Classroom
  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      setDeletingRoom(true);
      setDeleteRoomError(null);
      const res = await fetch(`/api/admin/classrooms/${roomToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการลบห้องเรียน");
      }
      setClassrooms((prev) => prev.filter((c) => c.id !== roomToDelete.id));
      setRoomToDelete(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteRoomError(err.message);
      } else {
        setDeleteRoomError("เกิดข้อผิดพลาดในการลบ");
      }
    } finally {
      setDeletingRoom(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-red-600 transition-colors">
              หน้าหลัก
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">ห้องเรียน</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            จัดการห้องเรียน
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            สร้าง แก้ไข และเปิดใช้งานห้องเรียนสำหรับรอบจำลอง พร้อมกำหนดจำนวนกลุ่ม
          </p>
        </div>

        {/* Action Button Top Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-red-500/25 hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ สร้างห้องเรียน</span>
          </button>
        </div>
      </div>

      {/* Classroom stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Total Classrooms Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-red-50 text-red-600">
            <School className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ห้องเรียนทั้งหมด</p>
            {loading && classrooms.length === 0 ? (
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg mt-0.5" />
            ) : (
              <p className="text-lg sm:text-3xl font-medium text-slate-900 tracking-tight sm:mt-0.5">
                {totalCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Active Classrooms Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">เปิดใช้งาน</p>
            {loading && classrooms.length === 0 ? (
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 rounded-lg mt-0.5" />
            ) : (
              <p className="text-lg sm:text-3xl font-medium text-slate-900 tracking-tight sm:mt-0.5">
                {activeCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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
            placeholder="ค้นหาชื่อห้องเรียนหรือรหัส..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
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
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-xs font-normal text-slate-700 focus:border-red-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="ACTIVE">เปิดใช้งาน</option>
              <option value="INACTIVE">ปิดใช้งาน</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchClassrooms()}
            disabled={loading}
            title="รีเฟรชข้อมูล"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Classroom Cards Grid View */}
      {loading && classrooms.length === 0 ? (
        <ClassroomsGridSkeleton count={6} />
      ) : filteredClassrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 px-4 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 mb-4">
            <School className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">ยังไม่มีข้อมูลห้องเรียน</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {searchQuery
              ? `ไม่พบห้องเรียนที่ตรงกับคำค้นหา "${searchQuery}"`
              : "เริ่มต้นโดยการสร้างห้องเรียนแรกสำหรับใช้งานในรอบจำลอง"}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ สร้างห้องเรียน</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {(() => {
            const paginated = filteredClassrooms.slice(
              (currentPage - 1) * ITEMS_PER_PAGE,
              currentPage * ITEMS_PER_PAGE
            );

            return (
              <>
                {paginated.map((room) => {
                  const isActive = room.isActive !== false;

                  return (
                    <div
                      key={room.id}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-red-300 hover:shadow-xl hover:shadow-red-500/5 transition-all overflow-hidden"
                    >
                      {/* Top Bar inside Card */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all shadow-2xs">
                              <School className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-red-600 transition-colors line-clamp-2">
                              {room.name}
                            </h3>
                          </div>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => toggleRoomStatus(e, room)}
                              disabled={togglingId === room.id}
                              title={isActive ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                isActive ? "bg-red-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isActive ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openEditModal(e, room)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="แก้ไขห้องเรียน"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoomToDelete(room);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="ลบห้องเรียน"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Room Description */}
                        {room.description ? (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                            {room.description}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic mb-3">
                            ไม่มีคำอธิบายเพิ่มเติม
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">
                            {room.groupCount}
                          </span>
                          <span>กลุ่มสำหรับรอบจำลอง</span>
                        </div>

                      </div>

                      {/* Card footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(room.createdAt).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>

                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {isActive ? "พร้อมใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Classroom Card */}
                <button
                  type="button"
                  onClick={openAddModal}
                  className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-6 text-center hover:border-red-400 hover:bg-red-50/20 transition-all cursor-pointer group min-h-[220px]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-2xs border border-slate-200/80 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all mb-3">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                    + สร้างห้องเรียนใหม่
                  </span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    เพิ่มห้องเรียนเพื่อใช้งานในรอบจำลอง
                  </span>
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && filteredClassrooms.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 shadow-xs">
          <div>
            แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} ถึง{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredClassrooms.length)} จากทั้งหมด{" "}
            {filteredClassrooms.length} ห้องเรียน
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-medium text-slate-700">
              หน้า {currentPage} / {Math.max(1, Math.ceil(filteredClassrooms.length / ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(Math.ceil(filteredClassrooms.length / ITEMS_PER_PAGE), p + 1)
                )
              }
              disabled={currentPage >= Math.ceil(filteredClassrooms.length / ITEMS_PER_PAGE)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Classroom */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <School className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">สร้างห้องเรียนใหม่</h3>
                  <p className="text-xs text-slate-500">กำหนดชื่อ รายละเอียด และจำนวนกลุ่ม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addRoomError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{addRoomError}</span>
              </div>
            )}

            <form onSubmit={handleAddClassroom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อห้องเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="เช่น ห้องเรียนจำลอง A, รอบฝึกปฏิบัติการแพทย์"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label htmlFor="new-room-group-count" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนกลุ่ม <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-room-group-count"
                  type="number"
                  required
                  min={1}
                  max={MAX_CLASSROOM_GROUP_COUNT}
                  step={1}
                  inputMode="numeric"
                  value={newRoomGroupCount}
                  onChange={(e) => setNewRoomGroupCount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ระบบจะสร้างกลุ่ม 1 ถึงกลุ่ม {newRoomGroupCount || "N"} ให้อัตโนมัติ (สูงสุด {MAX_CLASSROOM_GROUP_COUNT} กลุ่ม)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  คำอธิบายเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="เช่น ห้องเรียนวิชาฝึกปฏิบัติการแพทย์จำลอง..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={addingRoom}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-red-500/25 hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {addingRoom && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{addingRoom ? "กำลังสร้าง..." : "สร้างห้องเรียน"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Classroom */}
      {roomToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">แก้ไขข้อมูลห้องเรียน</h3>
                  <p className="text-xs text-slate-500">ปรับปรุงชื่อ รายละเอียด และจำนวนกลุ่ม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editRoomError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{editRoomError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อห้องเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label htmlFor="edit-room-group-count" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนกลุ่ม <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-room-group-count"
                  type="number"
                  required
                  min={1}
                  max={MAX_CLASSROOM_GROUP_COUNT}
                  step={1}
                  inputMode="numeric"
                  value={editRoomGroupCount}
                  onChange={(e) => setEditRoomGroupCount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  หากลดจำนวน กลุ่มส่วนเกินจะถูกปิดใช้งาน และสามารถเปิดกลับได้ภายหลัง
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  คำอธิบาย
                </label>
                <textarea
                  rows={2}
                  value={editRoomDescription}
                  onChange={(e) => setEditRoomDescription(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10 resize-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-150">
                <span className="text-xs font-medium text-slate-700">สถานะการใช้งาน</span>
                <button
                  type="button"
                  onClick={() => setEditRoomIsActive((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editRoomIsActive ? "bg-red-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      editRoomIsActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEditRoom}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-red-500/25 hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingEditRoom && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{savingEditRoom ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ยืนยันการลบห้องเรียน &quot;{roomToDelete.name}&quot;?
            </h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              การลบห้องเรียนและข้อมูลรอบจำลองที่เกี่ยวข้องไม่สามารถกู้คืนได้
            </p>

            {deleteRoomError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{deleteRoomError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                disabled={deletingRoom}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={deletingRoom}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deletingRoom && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{deletingRoom ? "กำลังลบ..." : "ยืนยันการลบ"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
