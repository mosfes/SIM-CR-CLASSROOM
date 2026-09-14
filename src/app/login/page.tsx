import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentAdmin } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบแอดมิน — SIM CR Classroom",
  description: "เข้าสู่ระบบสำหรับผู้ดูแล SIM CR Classroom",
};

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        {/* Center Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
          {/* Header & Logo */}
          <div className="text-center">
            <div className="mx-auto relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-red-100 bg-white shadow-md shadow-red-500/10">
              <Image
                src="/logo.png"
                alt="SIM CR Classroom Logo"
                width={70}
                height={70}
                className="h-full w-full object-cover object-top scale-[1.7] origin-top translate-y-0.5"
                priority
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xl font-bold tracking-normal text-slate-900">SIM CR Classroom</span>
              <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 border border-red-200/60">
                ADMIN
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              กรอกข้อมูลเพื่อเข้าสู่ระบบจัดการผู้ดูแล SIM CR Classroom
            </p>
          </div>

          {/* Form */}
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        {/* Bottom Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Developed by{" "}
          <a
            href="https://me.mosapps.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 hover:text-red-600 hover:underline transition-colors"
          >
            mosapps
          </a>
        </p>
      </div>
    </main>
  );
}

