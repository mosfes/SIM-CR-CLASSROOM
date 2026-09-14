"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  XCircle,
  Search,
  UserPlus,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
  Eye,
  EyeOff,
  AtSign,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminsTableSkeleton } from "@/components/admin/skeleton-loaders";

interface AdminUser {
  id: string;
  role: "ADMIN";
  username: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  isActive?: boolean;
  createdAt: string;
}

export function AdminsContent({ initialAdmins }: { initialAdmins: AdminUser[] }) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal state
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const openModal = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setAddError(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setAddError(null);
    setShowAddModal(false);
  };

  // Edit Modal state
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (admin: AdminUser) => {
    let fn = admin.firstName || "";
    let ln = admin.lastName || "";
    if (!fn && admin.name) {
      const parts = admin.name.trim().split(/\s+/);
      fn = parts[0] || "";
      ln = parts.slice(1).join(" ") || "";
    }
    setAdminToEdit(admin);
    setEditFirstName(fn);
    setEditLastName(ln);
    setEditUsername(admin.username || "");
    setEditPassword("");
    setEditIsActive(admin.isActive !== false);
    setShowEditPassword(false);
    setEditError(null);
  };

  const closeEditModal = () => {
    setAdminToEdit(null);
    setEditFirstName("");
    setEditLastName("");
    setEditUsername("");
    setEditPassword("");
    setEditIsActive(true);
    setShowEditPassword(false);
    setEditError(null);
  };

  const fetchAdmins = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("role", "ADMIN");
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();

      if (json.success) {
        setAdmins(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load admins:", err);
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
        fetchAdmins();
      },
      searchQuery.trim() ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [searchQuery, fetchAdmins]);

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/admin/users/${adminToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลบแอดมิน");
      }
      setAdminToDelete(null);
      fetchAdmins();
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

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password) {
      setAddError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    try {
      setAdding(true);
      setAddError(null);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "ADMIN",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      setFirstName("");
      setLastName("");
      setUsername("");
      setPassword("");
      setShowAddModal(false);
      fetchAdmins();
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

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToEdit) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
      return;
    }
    if (!editUsername.trim()) {
      setEditError("กรุณากรอก Username");
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setEditError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);

      const payload: {
        firstName: string;
        lastName: string;
        username: string;
        password?: string;
        isActive?: boolean;
      } = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        username: editUsername.trim(),
        isActive: editIsActive,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${adminToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }

      closeEditModal();
      fetchAdmins();
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

  const toggleAdminStatus = async (admin: AdminUser) => {
    try {
      setTogglingId(admin.id);
      const newStatus = admin.isActive === false ? true : false;
      const res = await fetch(`/api/admin/users/${admin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      }
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, isActive: newStatus } : a))
      );
    } catch (err) {
      console.error("Error toggling admin status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (statusFilter === "ACTIVE") return a.isActive !== false;
      if (statusFilter === "INACTIVE") return a.isActive === false;
      return true;
    });
  }, [admins, statusFilter]);

  const getInitials = (name: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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

  const totalCount = admins.length;
  const activeCount = admins.filter((a) => a.isActive !== false).length;
  const inactiveCount = admins.filter((a) => a.isActive === false).length;

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
            <span className="font-medium text-slate-800">จัดการผู้ใช้งาน (แอดมิน)</span>
          </nav>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            จัดการผู้ใช้งาน (แอดมิน)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            จัดการข้อมูลผู้ดูแลระบบและสิทธิ์การเข้าใช้งานทั้งหมด
          </p>
        </div>

        {/* Action Button Top Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm shadow-rose-500/25 hover:bg-rose-700 transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ เพิ่มแอดมิน</span>
          </button>
        </div>
      </div>

      {/* 3 Stat Cards Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs">
          <div className="flex h-8 w-8 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600">
            <Users className="h-4 w-4 sm:h-7 sm:w-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-normal text-slate-500">ทั้งหมด</p>
            {loading && admins.length === 0 ? (
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
            {loading && admins.length === 0 ? (
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
            {loading && admins.length === 0 ? (
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
              placeholder="ค้นหา username, ชื่อ-สกุล..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-rose-500/10"
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

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-xs font-normal text-slate-700 focus:border-rose-500 focus:outline-none"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="ACTIVE">ใช้งาน</option>
                <option value="INACTIVE">ปิดใช้งาน</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchAdmins()}
              disabled={loading}
              title="รีเฟรชข้อมูล"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-rose-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          {loading && admins.length === 0 ? (
            <AdminsTableSkeleton rows={5} />
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-base font-medium text-slate-800">ยังไม่มีข้อมูลแอดมิน</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {searchQuery
                  ? `ไม่พบข้อมูลแอดมินที่ตรงกับคำค้นหา "${searchQuery}"`
                  : "เริ่มต้นโดยการเพิ่มผู้ดูแลระบบคนแรกเข้าสู่ระบบ"}
              </p>
              <button
                type="button"
                onClick={openModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ เพิ่มแอดมิน</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Username</th>
                    <th className="px-6 py-4 whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 whitespace-nowrap">สิทธิ์</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const paginatedAdmins = filteredAdmins.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    return paginatedAdmins.map((admin) => {
                      const initials = getInitials(admin.name);
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Username with Avatar Badge */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-medium text-xs shadow-xs">
                                {initials}
                              </div>
                              <div className="flex items-center gap-1 font-mono text-xs font-medium text-slate-900">
                                <AtSign className="h-3.5 w-3.5 text-rose-500" />
                                <span>{admin.username}</span>
                              </div>
                            </div>
                          </td>

                          {/* Full Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-normal text-slate-900">{admin.name}</div>
                          </td>

                          {/* Role Badge */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-normal text-rose-700 border border-rose-200/60">
                              Admin
                            </span>
                          </td>

                          {/* Status Badge Toggle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleAdminStatus(admin)}
                              disabled={togglingId === admin.id}
                              title="คลิกเพื่อเปลี่ยนสถานะ เปิด/ปิดใช้งาน"
                              className="cursor-pointer group focus:outline-none transition-transform active:scale-95"
                            >
                              {togglingId === admin.id ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 border border-slate-200">
                                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                                  <span>กำลังเปลี่ยน...</span>
                                </span>
                              ) : admin.isActive !== false ? (
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
                            {formatDate(admin.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(admin)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminToDelete(admin)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="ลบแอดมินนี้"
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
          {!loading && filteredAdmins.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-6 text-xs text-slate-500">
              <div>
                แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง{" "}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredAdmins.length)}
                </span>{" "}
                จากทั้งหมด <span className="font-semibold text-slate-800">{filteredAdmins.length.toLocaleString()}</span> รายการ
              </div>

              {Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE) > 1 && (
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

                  {Array.from({ length: Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter((page) => {
                      const total = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE);
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
                                ? "bg-rose-600 text-white shadow-xs"
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
                      setCurrentPage((p) => Math.min(Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE), p + 1))
                    }
                    disabled={currentPage === Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE)}
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

      {/* Quick Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">เพิ่มผู้ดูแลระบบ (Admin)</h3>
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

            <form onSubmit={handleAddAdmin} autoComplete="off" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="admin_first_name"
                    autoComplete="off"
                    placeholder="เช่น สมศักดิ์"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="admin_last_name"
                    autoComplete="off"
                    placeholder="เช่น รักชาติ"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={64}
                  pattern="[A-Za-z0-9._-]+"
                  name="admin_new_username"
                  autoComplete="off"
                  placeholder="เช่น somsak_admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    name="admin_new_password"
                    minLength={8}
                    maxLength={256}
                    autoComplete="new-password"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-10 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
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
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกแอดมิน</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {adminToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Edit3 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลผู้ดูแลระบบ</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditAdmin} autoComplete="off" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="admin_edit_first_name"
                    autoComplete="off"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="admin_edit_last_name"
                    autoComplete="off"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="admin_edit_username"
                  minLength={3}
                  maxLength={64}
                  pattern="[A-Za-z0-9._-]+"
                  autoComplete="off"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    name="admin_edit_password"
                    minLength={8}
                    maxLength={256}
                    autoComplete="new-password"
                    placeholder="อย่างน้อย 8 ตัวอักษร (ถ้าต้องการเปลี่ยน)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-10 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-3 focus:ring-rose-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
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
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
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

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบผู้ดูแลระบบ</h3>
                <p className="mt-1 text-xs text-slate-500">
                  คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ{" "}
                  <strong className="text-slate-800">{adminToDelete.name}</strong> (Username:{" "}
                  {adminToDelete.username}) ออกจากระบบ?
                </p>

                {deleteError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{deleteError}</p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminToDelete(null);
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
    </div>
  );
}
