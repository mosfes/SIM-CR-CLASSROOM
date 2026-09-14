"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserCog,
  UserPlus,
  Search,
  Trash2,
  RefreshCw,
  Clock,
  IdCard,
  AtSign,
  AlertTriangle,
  X,
  Activity,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Eye,
  EyeOff,
  School,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewTableSkeleton } from "@/components/admin/skeleton-loaders";

interface UserItem {
  id: string;
  role: "ADMIN" | "STUDENT";
  studentId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string;
  isActive?: boolean;
  createdAt: string;
}

interface Stats {
  total: number;
  students: number;
  admins: number;
  diseases: number;
  classrooms?: number;
}

export function OverviewContent({
  initialUsers,
  initialStats,
}: {
  initialUsers: UserItem[];
  initialStats: Stats;
}) {
  const currentAdmin = useAdmin();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeRole = searchParams.get("role") || "ALL";

  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Delete state
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit state
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (user: UserItem) => {
    setUserToEdit(user);
    setEditIsActive(user.isActive !== false);
    if (user.role === "ADMIN") {
      let fn = user.firstName || "";
      let ln = user.lastName || "";
      if (!fn && user.name) {
        const parts = user.name.trim().split(/\s+/);
        fn = parts[0] || "";
        ln = parts.slice(1).join(" ") || "";
      }
      setEditFirstName(fn);
      setEditLastName(ln);
      setEditUsername(user.username || "");
      setEditPassword("");
      setShowEditPassword(false);
    } else {
      setEditStudentId(user.studentId || "");
      setEditName(user.name || "");
    }
    setEditError(null);
  };

  const closeEditModal = () => {
    setUserToEdit(null);
    setEditFirstName("");
    setEditLastName("");
    setEditUsername("");
    setEditStudentId("");
    setEditName("");
    setEditPassword("");
    setEditIsActive(true);
    setShowEditPassword(false);
    setEditError(null);
  };

  const toggleUserStatus = async (user: UserItem) => {
    try {
      setTogglingId(user.id);
      const newStatus = user.isActive === false ? true : false;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      console.error("Error toggling user status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    try {
      setSavingEdit(true);
      setEditError(null);

      const payload: {
        firstName?: string;
        lastName?: string;
        username?: string;
        password?: string;
        studentId?: string;
        name?: string;
        isActive?: boolean;
      } = {
        isActive: editIsActive,
      };

      if (userToEdit.role === "ADMIN") {
        if (!editFirstName.trim() || !editLastName.trim()) {
          setEditError("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
          setSavingEdit(false);
          return;
        }
        if (!editUsername.trim()) {
          setEditError("กรุณากรอก Username");
          setSavingEdit(false);
          return;
        }
        if (editPassword && editPassword.length < 8) {
          setEditError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
          setSavingEdit(false);
          return;
        }
        payload.firstName = editFirstName.trim();
        payload.lastName = editLastName.trim();
        payload.username = editUsername.trim();
        if (editPassword.trim()) {
          payload.password = editPassword.trim();
        }
      } else {
        if (!editStudentId.trim() || !editName.trim()) {
          setEditError("กรุณากรอกรหัสและชื่อนักเรียนให้ครบถ้วน");
          setSavingEdit(false);
          return;
        }
        payload.studentId = editStudentId.trim();
        payload.name = editName.trim();
      }

      const res = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }

      closeEditModal();
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("เกิดข้อผิดพลาดในการบันทึก");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      const params = new URLSearchParams();
      if (activeRole !== "ALL") {
        params.set("role", activeRole);
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/api/admin/users?${queryString}` : `/api/admin/users`;

      const res = await fetch(endpoint, {
        signal: controller.signal,
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้");
      }

      setUsers(json.data || []);
      if (json.stats) {
        setStats(json.stats);
      }
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("การเชื่อมต่อไปยังฐานข้อมูลใช้เวลานานเกินกำหนด กรุณากดลองใหม่อีกครั้ง");
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ชั่วคราว (เซิร์ฟเวอร์อาจกำลังเริ่มระบบใหม่) กรุณากดลองใหม่อีกครั้ง");
      } else {
        console.error("Failed to load users:", err);
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [activeRole, searchQuery, router]);

  // SSR already provided data matching the default (role=ALL, no search) view —
  // skip the redundant fetch on first mount when filters are still at that default.
  const skipInitialFetch = useRef(activeRole === "ALL" && !searchQuery.trim());

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const timer = setTimeout(
      () => {
        fetchUsers();
      },
      searchQuery.trim() ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  const handleRoleFilter = (role: string) => {
    setCurrentPage(1);
    if (role === "ALL") {
      router.push("/admin", { scroll: false });
    } else {
      router.push(`/admin?role=${role}`, { scroll: false });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลบผู้ใช้");
      }
      setUserToDelete(null);
      fetchUsers();
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

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("th-TH", {
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
    <div className="space-y-8">
      {/* Welcome & Biomedical Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-red-600 via-rose-600 to-slate-950 p-6 text-white shadow-xl shadow-red-900/20 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white shadow-lg sm:flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Admin Mascot"
                width={120}
                height={120}
                className="h-full w-full object-cover object-top scale-[1.7] origin-top translate-y-1"
                priority
              />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md border border-white/10 shadow-xs">
                <Activity className="h-3.5 w-3.5 text-rose-200 animate-pulse" />
                <span>ภาพรวมระบบจัดการผู้ใช้</span>
              </div>
              <h2 className="text-xl font-medium sm:text-2xl tracking-tight">
                ยินดีต้อนรับ, {currentAdmin?.name || "ผู้ดูแลระบบ"}
              </h2>
            </div>
          </div>
        </div>

        {/* Biomedical Decorative Background (DNA Double Helix, ECG Pulse, Molecular Network) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Ambient Glowing Blobs */}
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-rose-500/30 blur-3xl" />
          <div className="absolute right-1/3 -bottom-10 h-48 w-48 rounded-full bg-red-500/25 blur-2xl" />
          <div className="absolute left-1/4 -top-8 h-36 w-36 rounded-full bg-white/5 blur-xl" />

          {/* Biomedical SVG Elements */}
          <svg
            className="absolute inset-0 h-full w-full opacity-35"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 900 220"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="dnaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#fda4af" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="25%" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="75%" stopColor="#fda4af" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* ECG Pulse Heartbeat Waveform Line across the banner */}
            <path
              d="M 0,165 L 320,165 L 340,165 L 350,145 L 360,185 L 375,100 L 390,205 L 405,150 L 415,172 L 425,165 L 560,165 L 570,148 L 580,180 L 595,115 L 610,195 L 625,155 L 635,168 L 645,165 L 900,165"
              fill="none"
              stroke="url(#ecgGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Molecular Hexagonal Chemical Bonds */}
            <g transform="translate(610, 25)" stroke="#ffffff" strokeWidth="1.2" fill="none" strokeOpacity="0.35">
              <polygon points="35,0 65,18 65,52 35,70 5,52 5,18" />
              <polygon points="65,18 95,0 125,18 125,52 95,70 65,52" />
              <polygon points="35,70 65,88 65,122 35,140 5,122 5,88" />
              <circle cx="35" cy="0" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="65" cy="18" r="3" fill="#fda4af" fillOpacity="0.9" />
              <circle cx="95" cy="0" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="125" cy="18" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="125" cy="52" r="3" fill="#fda4af" fillOpacity="0.8" />
              <circle cx="95" cy="70" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="65" cy="52" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="35" cy="70" r="3" fill="#fda4af" fillOpacity="0.9" />
              <circle cx="5" cy="52" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="5" cy="18" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="5" cy="88" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="5" cy="122" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="35" cy="140" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="65" cy="122" r="3" fill="#ffffff" fillOpacity="0.8" />
              <circle cx="65" cy="88" r="3" fill="#ffffff" fillOpacity="0.8" />
            </g>

            {/* DNA Double Helix Structure on Right */}
            <g transform="translate(760, 5)">
              {/* DNA Helix Strand A */}
              <path
                d="M 15,-10 Q 50,20 85,50 T 15,110 T 85,170 T 15,230"
                fill="none"
                stroke="url(#dnaGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* DNA Helix Strand B */}
              <path
                d="M 85,-10 Q 50,20 15,50 T 85,110 T 15,170 T 85,230"
                fill="none"
                stroke="url(#dnaGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Base pair rungs */}
              <line x1="26" y1="10" x2="74" y2="10" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="50" y1="20" x2="50" y2="20" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.8" />
              <line x1="26" y1="35" x2="74" y2="35" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="15" y1="50" x2="85" y2="50" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.65" />
              <line x1="26" y1="65" x2="74" y2="65" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="26" y1="95" x2="74" y2="95" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="15" y1="110" x2="85" y2="110" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.65" />
              <line x1="26" y1="125" x2="74" y2="125" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="26" y1="155" x2="74" y2="155" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
              <line x1="15" y1="170" x2="85" y2="170" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.65" />
              <line x1="26" y1="185" x2="74" y2="185" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />

              {/* Helix Atoms / Nodes */}
              <circle cx="15" cy="50" r="3.5" fill="#ffffff" />
              <circle cx="85" cy="50" r="3.5" fill="#fda4af" />
              <circle cx="15" cy="110" r="3.5" fill="#fda4af" />
              <circle cx="85" cy="110" r="3.5" fill="#ffffff" />
              <circle cx="15" cy="170" r="3.5" fill="#ffffff" />
              <circle cx="85" cy="170" r="3.5" fill="#fda4af" />
            </g>

            {/* Floating Bio-Particles */}
            <circle cx="490" cy="50" r="2" fill="#ffffff" fillOpacity="0.5" />
            <circle cx="535" cy="80" r="3" fill="#fda4af" fillOpacity="0.4" />
            <circle cx="450" cy="110" r="1.5" fill="#ffffff" fillOpacity="0.6" />
            <circle cx="630" cy="180" r="2" fill="#ffffff" fillOpacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total Classrooms Card Link */}
        <Link
          href="/admin/classrooms"
          className="text-left group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 transition-all hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10"
        >
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-rose-700 line-clamp-1">
              ห้องเรียน
            </span>
            <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-100/60 group-hover:scale-110 transition-transform">
              <School className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-baseline gap-1 sm:gap-2">
            {loading && users.length === 0 && !error ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16 rounded-lg" />
            ) : (
              <>
                <span className="text-xl sm:text-3xl font-medium text-rose-700">
                  {error && users.length === 0 ? "-" : (stats.classrooms ?? 0)}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">ห้อง</span>
              </>
            )}
          </div>
          <div className="mt-2 hidden sm:flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span className="group-hover:text-rose-700 transition-colors font-normal">
              ไปที่หน้าจัดการห้องเรียน
            </span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Total Students Card Link */}
        <Link
          href="/admin/students"
          className="text-left group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 transition-all hover:border-red-400 hover:shadow-lg hover:shadow-red-500/10"
        >
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-red-600 line-clamp-1">
              นักเรียน
            </span>
            <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
              <UserCheck className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-baseline gap-1 sm:gap-2">
            {loading && users.length === 0 && !error ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16 rounded-lg" />
            ) : (
              <>
                <span className="text-xl sm:text-3xl font-medium text-red-600">
                  {error && users.length === 0 ? "-" : stats.students}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">คน</span>
              </>
            )}
          </div>
          <div className="mt-2 hidden sm:flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span className="group-hover:text-red-600 transition-colors font-normal">ไปที่หน้าจัดการนักเรียน</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Total Admins Card Link */}
        <Link
          href="/admin/admins"
          className="text-left group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 transition-all hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10"
        >
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-rose-700 line-clamp-1">
              แอดมิน
            </span>
            <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-700 group-hover:scale-110 transition-transform">
              <UserCog className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-baseline gap-1 sm:gap-2">
            {loading && users.length === 0 && !error ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16 rounded-lg" />
            ) : (
              <>
                <span className="text-xl sm:text-3xl font-medium text-rose-700">
                  {error && users.length === 0 ? "-" : stats.admins}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">คน</span>
              </>
            )}
          </div>
          <div className="mt-2 hidden sm:flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span className="group-hover:text-rose-700 transition-colors font-normal">ไปที่หน้าจัดการแอดมิน</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Total Diseases Card Link */}
        <Link
          href="/admin/diseases"
          className="text-left group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 transition-all hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-emerald-700 line-clamp-1">
              โรคทั้งหมด
            </span>
            <div className="flex h-7 w-7 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Activity className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-baseline gap-1 sm:gap-2">
            {loading && users.length === 0 && !error ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16 rounded-lg" />
            ) : (
              <>
                <span className="text-xl sm:text-3xl font-medium text-emerald-700">
                  {error && users.length === 0 ? "-" : stats.diseases}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">โรค</span>
              </>
            )}
          </div>
          <div className="mt-2 hidden sm:flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
            <span className="group-hover:text-emerald-700 transition-colors font-normal">ไปที่หน้าจัดการโรค</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Filters & Header Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleRoleFilter("ALL")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeRole === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>ทั้งหมด</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilter("STUDENT")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeRole === "STUDENT"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>นักเรียน</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilter("ADMIN")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeRole === "ADMIN"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCog className="h-3.5 w-3.5" />
              <span>แอดมิน</span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อ, รหัส, username..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-red-500/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchUsers()}
              disabled={loading}
              title="รีเฟรชข้อมูล"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-red-600" : ""}`} />
            </button>
          </div>
        </div>

        {error && users.length > 0 && (
          <div className="mx-5 my-3 flex items-center justify-between rounded-2xl bg-red-50 border border-red-200/80 px-4 py-3 text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchUsers()}
              className="font-semibold underline hover:text-red-800 transition-colors cursor-pointer"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          {error && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">ไม่สามารถโหลดข้อมูลได้</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => fetchUsers()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          ) : loading && users.length === 0 ? (
            <OverviewTableSkeleton rows={5} />
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {searchQuery
                  ? `ไม่พบผลลัพธ์ที่ตรงกับ "${searchQuery}" ลองเปลี่ยนคำค้นหา`
                  : activeRole !== "ALL"
                  ? `ยังไม่มีผู้ใช้ในหมวดหมู่นี้ในระบบ`
                  : "ยังไม่มีผู้ใช้งานในระบบ เริ่มต้นด้วยการเพิ่มผู้ใช้คนแรก"}
              </p>
              <Link
                href="/admin/users/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>เพิ่มผู้ใช้ใหม่</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5 whitespace-nowrap">ประเภท</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">รหัส / Username</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">ชื่อ-สกุล</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">วันที่เพิ่ม</th>
                    <th className="px-6 py-3.5 whitespace-nowrap text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const paginatedUsers = users.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    return paginatedUsers.map((u) => {
                      const isStudent = u.role === "STUDENT";
                      return (
                        <tr key={u.id} className="hover:bg-red-50/30 transition-colors">
                          {/* Role Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isStudent ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200/60">
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>นักเรียน</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200/60">
                                <UserCog className="h-3.5 w-3.5" />
                                <span>แอดมิน</span>
                              </span>
                            )}
                          </td>

                          {/* ID / Username Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isStudent ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800">
                                <IdCard className="h-3.5 w-3.5 text-slate-400" />
                                <span>{u.studentId || "-"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-700">
                                <AtSign className="h-3.5 w-3.5 text-rose-400" />
                                <span>{u.username || "-"}</span>
                              </div>
                            )}
                          </td>

                          {/* Name Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{u.name}</div>
                          </td>

                          {/* Status Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              disabled={togglingId === u.id}
                              title="คลิกเพื่อเปลี่ยนสถานะ เปิด/ปิดใช้งาน"
                              className="cursor-pointer group focus:outline-none transition-transform active:scale-95"
                            >
                              {togglingId === u.id ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-500 border border-slate-200">
                                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                                  <span>กำลังเปลี่ยน...</span>
                                </span>
                              ) : u.isActive !== false ? (
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

                          {/* Date Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{formatDate(u.createdAt)}</span>
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="ลบผู้ใช้นี้"
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
          {!loading && users.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-6 text-xs text-slate-500">
              <div>
                แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง{" "}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * ITEMS_PER_PAGE, users.length)}
                </span>{" "}
                จากทั้งหมด <span className="font-semibold text-slate-800">{users.length.toLocaleString()}</span> รายการ
              </div>

              {Math.ceil(users.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: Math.ceil(users.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                    .filter((page) => {
                      const total = Math.ceil(users.length / ITEMS_PER_PAGE);
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
                            className={`flex h-8 min-w-8 px-2.5 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
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
                      setCurrentPage((p) => Math.min(Math.ceil(users.length / ITEMS_PER_PAGE), p + 1))
                    }
                    disabled={currentPage === Math.ceil(users.length / ITEMS_PER_PAGE)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

      {/* Edit User Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    userToEdit.role === "ADMIN"
                      ? "bg-rose-100 text-rose-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    แก้ไขข้อมูล{userToEdit.role === "ADMIN" ? "ผู้ดูแลระบบ (Admin)" : "นักเรียน"}
                  </h3>
                </div>
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

            <form onSubmit={handleSaveEdit} autoComplete="off" className="mt-4 space-y-4">
              {userToEdit.role === "ADMIN" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        name="edit_admin_first_name"
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
                        name="edit_admin_last_name"
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
                      name="edit_admin_username"
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
                        name="edit_admin_password"
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
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัสนักเรียน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      name="edit_student_id_field"
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
                      name="edit_student_name_field"
                      autoComplete="off"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-3 focus:ring-red-500/10"
                    />
                  </div>
                </>
              )}

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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                    userToEdit.role === "ADMIN"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
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
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบผู้ใช้</h3>
                <p className="mt-1 text-xs text-slate-500">
                  คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
                  <strong className="text-slate-800">{userToDelete.name}</strong> (
                  {userToDelete.role === "STUDENT"
                    ? `รหัส ${userToDelete.studentId}`
                    : `Username: ${userToDelete.username}`}
                  ) ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>

                {deleteError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{deleteError}</p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUserToDelete(null);
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
