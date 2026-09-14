import Link from "next/link";
import { UserForm } from "@/components/admin/user-form";
import { UserCheck, UserCog, ArrowLeft, ChevronRight } from "lucide-react";

export const metadata = {
  title: "เพิ่มผู้ใช้ใหม่ | SIM CR Classroom Admin",
  description: "เพิ่มผู้ใช้ใหม่ในระบบ แยกเป็นนักเรียนและแอดมิน",
};

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-red-600 transition-colors">
            หน้าหลัก
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-800">เพิ่มผู้ใช้ใหม่</span>
        </nav>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>กลับหน้าภาพรวม</span>
        </Link>
      </div>

      {/* Form Component */}
      <UserForm />

      {/* Guidance Cards */}
      <div className="mx-auto mt-10 max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-xs mb-1.5">
            <UserCheck className="h-4 w-4" />
            <span>บัญชีนักเรียน (Student)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ระบุรหัสนักเรียนเฉพาะและชื่อ-สกุล สำหรับการจัดเก็บข้อมูลการเรียนและกิจกรรมในระบบ
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs mb-1.5">
            <UserCog className="h-4 w-4" />
            <span>บัญชีผู้ดูแลระบบ (Admin)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ระบุชื่อ, สกุล, Username และ Password สำหรับผู้ใช้งานที่มีสิทธิ์จัดการระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
