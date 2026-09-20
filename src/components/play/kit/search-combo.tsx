"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Search, X } from "lucide-react";
import type { PlayRoleId } from "@/lib/play/roles";
import { FieldLabel } from "./station-ui";
import { ROLE_THEME, inputClass } from "./theme";

export interface ComboOption {
  id: string;
  label: string;
  /** ข้อความรอง (ใช้ค้นหาได้ด้วย) เช่น รหัสโรคของชื่อโรค */
  sublabel?: string;
}

/**
 * ช่องพิมพ์ค้นหาแล้วเลือกจากรายการ (รหัสโรค / ชื่อโรค)
 * ใช้ key เปลี่ยนเพื่อล้างค่าจากภายนอก และรองรับลูกศร ↑ ↓ / Enter / Esc
 */
export function SearchCombo({
  roleId,
  label,
  required = false,
  placeholder,
  options,
  value,
  onChange,
  mono = false,
  emptyText = "ไม่มีข้อมูลในระบบ",
}: {
  roleId: PlayRoleId;
  label: string;
  required?: boolean;
  placeholder: string;
  options: ComboOption[];
  /** id ของตัวเลือกที่เลือกอยู่ ("" = ยังไม่เลือก) */
  value: string;
  onChange: (id: string) => void;
  mono?: boolean;
  emptyText?: string;
}) {
  const theme = ROLE_THEME[roleId];
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  function checkPlacement() {
    if (rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 80;
      const spaceAbove = rect.top - 80;
      setOpenUpward(spaceBelow < 280 && spaceAbove > spaceBelow);
    }
  }

  function handleOpen() {
    checkPlacement();
    setOpen(true);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query || options.find((option) => option.id === value)?.label === text) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) || (option.sublabel ?? "").toLowerCase().includes(query)
    );
  }, [options, text, value]);

  const selected = options.find((option) => option.id === value);

  function choose(option: ComboOption) {
    onChange(option.id);
    setText(option.label);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setText("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleOpen();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActiveIndex(0);
            if (value) onChange("");
            handleOpen();
          }}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClass(roleId)} pl-10 pr-10 ${mono ? "font-mono" : ""}`}
        />
        {text && (
          <button
            type="button"
            onClick={clear}
            title="ล้าง"
            aria-label="ล้างข้อความ"
            className="absolute right-2.5 top-1/2 mt-[3px] flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && (
          <div
            id={listId}
            role="listbox"
            className={`absolute left-0 right-0 z-50 max-h-64 overflow-y-auto rounded-2xl border bg-white p-1.5 shadow-2xl ${
              openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } ${theme.border}`}
          >
            {filtered.length > 0 ? (
              filtered.map((option, index) => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      index === activeIndex ? theme.rowActive : ""
                    } ${isSelected ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}
                  >
                    <span className={`min-w-0 truncate ${mono ? "font-mono" : ""}`}>
                      {option.label}
                      {option.sublabel && (
                        <span className="ml-2 font-mono text-xs font-medium text-slate-400">{option.sublabel}</span>
                      )}
                    </span>
                    {isSelected && <Check className={`h-4 w-4 shrink-0 ${theme.text}`} />}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-sm text-slate-400">
                {text.trim() ? <>ไม่พบรายการที่ตรงกับ &ldquo;{text}&rdquo;</> : emptyText}
              </p>
            )}
          </div>
        )}
      </div>
      {selected && (
        <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-bold ${theme.text}`}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          เลือกแล้ว: <span className={mono ? "font-mono" : ""}>{selected.label}</span>
        </p>
      )}
    </div>
  );
}
