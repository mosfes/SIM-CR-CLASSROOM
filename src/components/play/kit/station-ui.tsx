"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, CheckCircle2, Info, RotateCcw } from "lucide-react";
import { PLAY_ROLES, type PlayRoleId } from "@/lib/play/roles";
import { formatPatientCode } from "@/lib/patient-code";
import { ROLE_THEME, inputClass } from "./theme";

function roleIndex(roleId: PlayRoleId) {
  return PLAY_ROLES.findIndex((role) => role.id === roleId);
}

/** เส้นทางผู้ป่วยผ่าน 5 สถานี ไฮไลต์สถานีที่นักเรียนอยู่ตอนนี้ */
export function JourneyTracker({ roleId }: { roleId: PlayRoleId }) {
  const currentIndex = roleIndex(roleId);
  const previous = PLAY_ROLES[currentIndex - 1];
  const next = PLAY_ROLES[currentIndex + 1];

  return (
    <div>
      <ol className="flex items-start" aria-label="เส้นทางของผู้ป่วยระหว่างสถานี">
        {PLAY_ROLES.map((role, index) => {
          const Icon = role.icon;
          const theme = ROLE_THEME[role.id];
          const isCurrent = index === currentIndex;
          return (
            <li
              key={role.id}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute left-[-50%] top-[17px] h-0.5 w-full ${
                    index <= currentIndex ? "bg-slate-300" : "bg-slate-200"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition ${
                  isCurrent
                    ? `${theme.solid} shadow-md ring-4 ${theme.ring}`
                    : "border border-slate-200 bg-white text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`max-w-full truncate px-0.5 text-[11px] leading-tight sm:text-xs ${
                  isCurrent ? `font-black ${theme.text}` : "font-semibold text-slate-400"
                }`}
              >
                <span className="sm:hidden">{role.shortLabel}</span>
                <span className="hidden sm:inline">{role.label}</span>
              </span>
              {isCurrent && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${theme.soft} border`}>
                  คุณอยู่ที่นี่
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-xs font-medium text-slate-500">
        {previous ? (
          <>
            รับผู้ป่วยต่อจาก <strong className="font-bold text-slate-700">{previous.label}</strong>
          </>
        ) : (
          <strong className="font-bold text-slate-700">เริ่มต้นเส้นทางของผู้ป่วย</strong>
        )}
        <span className="mx-1.5 text-slate-300" aria-hidden>
          →
        </span>
        {next ? (
          <>
            ส่งต่อให้ <strong className="font-bold text-slate-700">{next.label}</strong>
          </>
        ) : (
          <strong className="font-bold text-slate-700">ปิดเคสเมื่อบันทึกเสร็จ</strong>
        )}
      </p>
    </div>
  );
}

/** หัวสถานี: ชื่อสถานี หน้าที่ และเส้นทางผู้ป่วย */
export function StationHero({
  roleId,
  title,
  description,
}: {
  roleId: PlayRoleId;
  title: string;
  description: string;
}) {
  const role = PLAY_ROLES[roleIndex(roleId)];
  const theme = ROLE_THEME[roleId];
  const Icon = role.icon;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r ${theme.gradient} px-4 py-3 text-white sm:px-6 sm:py-4`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/80">
              สถานีที่ {roleIndex(roleId) + 1} จาก {PLAY_ROLES.length} · {role.label}
            </p>
            <h1 className="text-lg font-black leading-tight sm:text-xl">{title}</h1>
          </div>
        </div>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/90 sm:text-sm">{description}</p>
      </div>
      <div className="px-3 py-2.5 sm:px-6 sm:py-3">
        <JourneyTracker roleId={roleId} />
      </div>
    </section>
  );
}

/** ส่วนของฟอร์มที่มีเลขลำดับ เห็นทันทีว่าต้องทำอะไรก่อน-หลัง และส่วนไหนเสร็จแล้ว */
export function FormSection({
  roleId,
  number,
  title,
  description,
  done = false,
  children,
  className = "",
}: {
  roleId: PlayRoleId;
  number: number;
  title: string;
  description?: string;
  done?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const theme = ROLE_THEME[roleId];
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 ${className}`}>
      <header className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            done ? "bg-emerald-500 text-white" : theme.solid
          }`}
          aria-hidden
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black leading-snug text-slate-900 sm:text-lg">{title}</h3>
          {description && <p className="mt-0.5 text-sm font-medium leading-relaxed text-slate-500">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-bold text-slate-700">
      {children}
      {required && (
        <span className="ml-1 text-rose-500" aria-hidden="true">
          *
        </span>
      )}
    </span>
  );
}

/** ช่องกรอกตัวเลขที่มีหน่วยต่อท้ายอยู่ในช่อง */
export function UnitInput({
  roleId,
  label,
  unit,
  ...inputProps
}: {
  roleId: PlayRoleId;
  label: string;
  unit: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) {
  return (
    <label className="block">
      <FieldLabel required={inputProps.required}>{label}</FieldLabel>
      <div className="relative">
        <input {...inputProps} className={`${inputClass(roleId)} pr-16`} />
        <span className="pointer-events-none absolute right-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-sm font-bold text-slate-400">
          {unit}
        </span>
      </div>
    </label>
  );
}

/** กล่องบอกใบ้/คำอธิบายสั้น ๆ */
export function Hint({
  children,
  tone = "neutral",
  icon: Icon = Info,
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
  icon?: LucideIcon;
}) {
  const classes =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const iconClasses = tone === "warning" ? "text-amber-600" : "text-slate-400";
  return (
    <p className={`flex items-start gap-2 rounded-xl border border-dashed p-3 text-sm font-medium leading-relaxed ${classes}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClasses}`} />
      <span>{children}</span>
    </p>
  );
}

export function ErrorBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="animate-game-pop flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-sm">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-black">{title}</h4>
        <p className="mt-0.5 text-xs font-medium leading-relaxed text-rose-800">{message}</p>
      </div>
    </div>
  );
}

/** บันทึกสำเร็จ: บอกรหัสผู้ป่วยและสถานีที่ผู้ป่วยถูกส่งต่อไป */
export function SuccessBanner({
  roleId,
  title,
  queueNumber,
  fallbackCode,
  detail,
}: {
  roleId: PlayRoleId;
  title: string;
  queueNumber?: number | null;
  fallbackCode?: string;
  detail?: ReactNode;
}) {
  const next = PLAY_ROLES[roleIndex(roleId) + 1];
  const NextIcon = next?.icon;
  const code = queueNumber != null ? formatPatientCode(queueNumber) : (fallbackCode ?? "");

  return (
    <div className="animate-game-pop flex items-start gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
        <span className="text-[9px] font-bold leading-none opacity-80">รหัส</span>
        <span className="text-base font-black leading-tight tabular-nums">{code || "✓"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-black">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          {title}
        </p>
        {detail && <p className="mt-0.5 text-sm font-medium text-emerald-800">{detail}</p>}
        <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          {next && NextIcon ? (
            <>
              ส่งต่อให้ {next.label}
              <ArrowRight className="h-3 w-3" />
              <NextIcon className="h-3.5 w-3.5" />
            </>
          ) : (
            <>เสร็จสิ้นรอบการรักษาผู้ป่วยรายนี้</>
          )}
        </p>
      </div>
    </div>
  );
}

export function TextPanel({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
      {label && <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>}
      <p className="text-sm font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">{children}</p>
    </div>
  );
}

export function InfoBlock({
  station,
  icon: Icon,
  title,
  by,
  children,
}: {
  station: PlayRoleId;
  icon: LucideIcon;
  title: string;
  by?: string;
  children: ReactNode;
}) {
  const theme = ROLE_THEME[station];
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-black ${theme.text}`}>
          <Icon className="h-4 w-4" />
          {title}
        </span>
        {by && <span className="text-[11px] font-medium text-slate-400">โดย {by}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * แถบปุ่มล่างของสถานี: พอดีกับขนาดปุ่ม ค้างอยู่ที่มุมล่างขวา เห็นปุ่มส่งชัดเจน และไม่บังข้อมูลด้านซ้าย
 */
export function ActionBar({
  roleId,
  saving,
  disabled = false,
  submitLabel,
  savingLabel,
  submitIcon: SubmitIcon,
  savingIcon: SavingIcon,
  onReset,
}: {
  roleId: PlayRoleId;
  saving: boolean;
  disabled?: boolean;
  hint?: string;
  submitLabel: string;
  savingLabel: string;
  submitIcon: LucideIcon;
  savingIcon: LucideIcon;
  onReset: () => void;
}) {
  const theme = ROLE_THEME[roleId];
  return (
    <div className="pointer-events-none sticky bottom-3 z-20 flex justify-end sm:bottom-4">
      <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-md sm:p-2">
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          <span>ล้างข้อมูล</span>
        </button>
        <button
          type="submit"
          disabled={saving || disabled}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-b-4 px-5 text-sm font-black text-white shadow-md transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 ${theme.cta}`}
        >
          {saving ? (
            <>
              <SavingIcon className="h-4 w-4 animate-pulse" />
              {savingLabel}
            </>
          ) : (
            <>
              <SubmitIcon className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
