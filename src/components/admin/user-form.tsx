"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  UserCog,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  User,
  KeyRound,
  IdCard,
  AtSign,
} from "lucide-react";

type RoleType = "STUDENT" | "ADMIN";

export function UserForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleType>("STUDENT");

  // Student fields
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  // Admin fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setStudentId("");
    setStudentName("");
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setError(null);
  };

  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let payload: Record<string, unknown>;

    if (role === "STUDENT") {
      if (!studentId.trim()) {
        setError("กรุณากรอกรหัสนักเรียน");
        return;
      }
      if (!studentName.trim()) {
        setError("กรุณากรอกชื่อ-สกุลนักเรียน");
        return;
      }
      payload = {
        role: "STUDENT",
        studentId: studentId.trim(),
        name: studentName.trim(),
      };
    } else {
      if (!firstName.trim()) {
        setError("กรุณากรอกชื่อแอดมิน");
        return;
      }
      if (!lastName.trim()) {
        setError("กรุณากรอกนามสกุลแอดมิน");
        return;
      }
      if (!username.trim()) {
        setError("กรุณากรอกชื่อผู้ใช้ (Username)");
        return;
      }
      if (!password || password.length < 8) {
        setError("กรุณากรอกรหัสผ่านอย่างน้อย 8 ตัวอักษร");
        return;
      }
      payload = {
        role: "ADMIN",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        password,
      };
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      setSuccess(
        role === "STUDENT"
          ? `เพิ่มนักเรียน "${studentName}" (รหัส ${studentId}) เรียบร้อยแล้ว`
          : `เพิ่มแอดมิน "${firstName} ${lastName}" (Username: ${username}) เรียบร้อยแล้ว`
      );
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Role Selection Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => handleRoleChange("STUDENT")}
          className={`flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all ${
            role === "STUDENT"
              ? "bg-white text-red-600 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              role === "STUDENT" ? "bg-red-50 text-red-600" : "bg-slate-200/60 text-slate-500"
            }`}
          >
            <UserCheck className="h-4 w-4" />
          </div>
          <span>เพิ่มนักเรียน (Student)</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange("ADMIN")}
          className={`flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all ${
            role === "ADMIN"
              ? "bg-white text-rose-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              role === "ADMIN" ? "bg-rose-50 text-rose-700" : "bg-slate-200/60 text-slate-500"
            }`}
          >
            <UserCog className="h-4 w-4" />
          </div>
          <span>เพิ่มแอดมิน (Admin)</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">ไม่สามารถบันทึกข้อมูลได้</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">บันทึกข้อมูลสำเร็จ</p>
              <p className="text-emerald-700 mt-0.5">{success}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
            >
              <span>ดูข้อมูลในหน้าภาพรวม</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              เพิ่มรายการอื่นต่อ
            </button>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                role === "STUDENT"
                  ? "bg-red-100 text-red-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {role === "STUDENT" ? (
                <UserCheck className="h-5 w-5" />
              ) : (
                <UserCog className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {role === "STUDENT" ? "กรอกข้อมูลนักเรียน" : "กรอกข้อมูลผู้ดูแลระบบ"}
              </h2>
              <p className="text-xs text-slate-500">
                {role === "STUDENT"
                  ? "กรอกรหัสนักเรียนและชื่อ-นามสกุลเพื่อลงทะเบียนนักเรียน"
                  : "กรอกชื่อ สกุล ยูสเซอร์เนม และรหัสผ่านเพื่อสร้างสิทธิ์แอดมิน"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              role === "STUDENT"
                ? "bg-red-50 text-red-700 border border-red-200/60"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            {role === "STUDENT" ? "นักเรียน" : "แอดมิน"}
          </span>
        </div>

        {/* Student Fields */}
        {role === "STUDENT" && (
          <div className="space-y-5">
            <div>
              <label htmlFor="studentId" className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสนักเรียน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IdCard className="h-4 w-4" />
                </div>
                <input
                  id="studentId"
                  type="text"
                  required
                  placeholder="เช่น 66010023 หรือ STU-101"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">รหัสประจำตัวนักเรียน ต้องไม่ซ้ำกับในระบบ</p>
            </div>

            <div>
              <label htmlFor="studentName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อ-สกุล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="studentName"
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Admin Fields */}
        {role === "ADMIN" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    required
                    placeholder="เช่น สมศักดิ์"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สกุล <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    required
                    placeholder="เช่น สิทธิราช"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <AtSign className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  name="admin_user_username"
                  minLength={3}
                  maxLength={64}
                  pattern="[A-Za-z0-9._-]+"
                  autoComplete="off"
                  placeholder="เช่น somsak_admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">ใช้สำหรับเข้าสู่ระบบ ต้องไม่ซ้ำกับในระบบ</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  name="admin_user_password"
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="แสดง/ซ่อนรหัสผ่าน"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span>ล้างฟอร์ม</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
              role === "STUDENT"
                ? "bg-red-600 hover:bg-red-700 shadow-red-500/25"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25"
            }`}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>
                  {role === "STUDENT" ? "บันทึกข้อมูลนักเรียน" : "บันทึกข้อมูลแอดมิน"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
