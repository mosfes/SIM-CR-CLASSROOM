"use client";

import type { ReactNode } from "react";
import { FieldError, Label, ListBox, Select } from "@heroui/react";

export type AppSelectTone = "red" | "fuchsia" | "sky" | "emerald" | "amber" | "indigo";

/**
 * form    — ช่องกรอกในฟอร์มของสถานีเล่นเกม (สูง 44px)
 * filter  — ตัวกรอง/เรียงลำดับบนแถบเครื่องมือหน้าแอดมิน (สูง 40px)
 * compact — ตัวเลือกเล็กแทรกในบรรทัดข้อความ เช่น "แสดงหน้าละ" (สูง 32px)
 */
export type AppSelectSize = "form" | "filter" | "compact";

export interface AppSelectOption {
  value: string;
  label: string;
  /** ป้ายตัวอักษรนำหน้า เช่น A, B, ก, ข */
  badge?: string;
}

interface AppSelectProps {
  options: readonly AppSelectOption[];
  /** ค่าที่เลือก — สตริงว่างหมายถึงยังไม่ได้เลือก (แสดง placeholder) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** ข้อความแทน placeholder เมื่อไม่มีตัวเลือกให้เลือกเลย */
  emptyText?: string;
  /** ป้ายกำกับที่เห็นบนหน้าจอ ถ้าไม่ใส่ต้องส่ง ariaLabel แทน */
  label?: string;
  ariaLabel?: string;
  /** ชื่อ field สำหรับ FormData (ส่งไปกับ hidden select) */
  name?: string;
  isRequired?: boolean;
  /** แสดงเครื่องหมาย * ต่อท้ายป้ายเมื่อ isRequired (ปิดได้เมื่อฟอร์มเดิมไม่แสดง) */
  showRequiredMark?: boolean;
  isDisabled?: boolean;
  tone?: AppSelectTone;
  size?: AppSelectSize;
  rounded?: "xl" | "2xl";
  /** ไอคอนหน้าค่าที่เลือก */
  icon?: ReactNode;
  /** class ของกล่องนอกสุด ใช้กำหนดความกว้าง เช่น "w-44" */
  className?: string;
  fullWidth?: boolean;
}

// class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
const TONES: Record<AppSelectTone, { trigger: string; item: string; check: string; badge: string }> = {
  red: {
    trigger:
      "hover:border-red-300 data-[focus-visible=true]:border-red-500 data-[focus-visible=true]:ring-red-100 aria-expanded:border-red-500 aria-expanded:ring-red-100",
    item: "hover:bg-red-50 data-[focused=true]:bg-red-50 data-[selected=true]:bg-red-100/70",
    check: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  fuchsia: {
    trigger:
      "hover:border-fuchsia-300 data-[focus-visible=true]:border-fuchsia-500 data-[focus-visible=true]:ring-fuchsia-100 aria-expanded:border-fuchsia-500 aria-expanded:ring-fuchsia-100",
    item: "hover:bg-fuchsia-50 data-[focused=true]:bg-fuchsia-50 data-[selected=true]:bg-fuchsia-100/70",
    check: "text-fuchsia-600",
    badge: "bg-fuchsia-100 text-fuchsia-700",
  },
  sky: {
    trigger:
      "hover:border-sky-300 data-[focus-visible=true]:border-sky-500 data-[focus-visible=true]:ring-sky-100 aria-expanded:border-sky-500 aria-expanded:ring-sky-100",
    item: "hover:bg-sky-50 data-[focused=true]:bg-sky-50 data-[selected=true]:bg-sky-100/70",
    check: "text-sky-600",
    badge: "bg-sky-100 text-sky-700",
  },
  emerald: {
    trigger:
      "hover:border-emerald-300 data-[focus-visible=true]:border-emerald-500 data-[focus-visible=true]:ring-emerald-100 aria-expanded:border-emerald-500 aria-expanded:ring-emerald-100",
    item: "hover:bg-emerald-50 data-[focused=true]:bg-emerald-50 data-[selected=true]:bg-emerald-100/70",
    check: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    trigger:
      "hover:border-amber-300 data-[focus-visible=true]:border-amber-500 data-[focus-visible=true]:ring-amber-100 aria-expanded:border-amber-500 aria-expanded:ring-amber-100",
    item: "hover:bg-amber-50 data-[focused=true]:bg-amber-50 data-[selected=true]:bg-amber-100/70",
    check: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  indigo: {
    trigger:
      "hover:border-indigo-300 data-[focus-visible=true]:border-indigo-500 data-[focus-visible=true]:ring-indigo-100 aria-expanded:border-indigo-500 aria-expanded:ring-indigo-100",
    item: "hover:bg-indigo-50 data-[focused=true]:bg-indigo-50 data-[selected=true]:bg-indigo-100/70",
    check: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
};

const SIZES: Record<AppSelectSize, { trigger: string; value: string; item: string; label: string }> = {
  form: {
    trigger: "h-11 px-3.5",
    value: "text-base text-slate-900",
    item: "py-2 text-base",
    label: "text-sm font-bold text-slate-700",
  },
  filter: {
    trigger: "h-10 px-3.5",
    value: "text-xs text-slate-700 sm:text-xs",
    item: "py-2 text-sm",
    label: "text-xs font-semibold text-slate-600",
  },
  compact: {
    trigger: "h-8 px-2.5",
    value: "text-xs font-bold text-slate-700 sm:text-xs",
    item: "py-1.5 text-sm",
    label: "text-xs font-semibold text-slate-600",
  },
};

function OptionBadge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

/** dropdown มาตรฐานของระบบ ใช้ HeroUI Select แทน <select> ของเบราว์เซอร์ */
export function AppSelect({
  options,
  value,
  onChange,
  placeholder = "เลือก",
  emptyText,
  label,
  ariaLabel,
  name,
  isRequired,
  showRequiredMark = true,
  isDisabled,
  tone = "red",
  size = "form",
  rounded = "xl",
  icon,
  className,
  fullWidth,
}: AppSelectProps) {
  const t = TONES[tone];
  const s = SIZES[size];
  const selected = options.find((option) => option.value === value);
  const radius = rounded === "2xl" ? "rounded-2xl" : "rounded-xl";

  return (
    <Select
      fullWidth={fullWidth}
      className={className}
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      aria-label={label ? undefined : ariaLabel}
      placeholder={options.length === 0 && emptyText ? emptyText : placeholder}
      value={value || null}
      onChange={(key) => onChange(key == null ? "" : String(key))}
    >
      {label && (
        <Label className={`${s.label}${isRequired && !showRequiredMark ? " after:hidden" : ""}`}>{label}</Label>
      )}
      <Select.Trigger
        className={`${radius} ${s.trigger} items-center border border-slate-200 bg-white shadow-none hover:bg-white data-[focus-visible=true]:bg-white data-[focus-visible=true]:ring-4 aria-expanded:ring-4 ${t.trigger}${label ? " mt-0.5" : ""}`}
      >
        {icon && <span className="mr-2 flex shrink-0 items-center text-slate-400">{icon}</span>}
        <Select.Value className={`flex min-w-0 items-center font-medium ${s.value}`}>
          {({ defaultChildren, isPlaceholder }) => {
            if (isPlaceholder || !selected) return defaultChildren;
            return (
              <span className="flex min-w-0 items-center gap-2.5">
                {selected.badge && <OptionBadge className={t.badge}>{selected.badge}</OptionBadge>}
                <span className="truncate">{selected.label}</span>
              </span>
            );
          }}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.badge ? `${option.badge}. ${option.label}` : option.label}
              className={`rounded-xl ${s.item} ${t.item}`}
            >
              {option.badge && <OptionBadge className={t.badge}>{option.badge}</OptionBadge>}
              <span className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug text-slate-800">
                {option.label}
              </span>
              <ListBox.ItemIndicator className={t.check} />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {isRequired && <FieldError className="text-xs font-medium">กรุณาเลือกข้อมูลในช่องนี้</FieldError>}
    </Select>
  );
}
