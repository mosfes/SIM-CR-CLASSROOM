"use client";

import { useEffect, useState } from "react";
import { HeartPulse, RefreshCw, X } from "lucide-react";

const textareaClass =
  "w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/10 resize-y leading-relaxed disabled:bg-slate-50";

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) => text.split("\n");

/**
 * จัดการ "ตัวลวง" ของสถานีพยาบาล: ตัวเลือกต่อมไร้ท่อ/ฮอร์โมนที่ไม่ใช่คำตอบของโรคใดเลย
 * ตัวเลือกที่นักเรียนเห็น = เฉลยของทุกโรค + ตัวลวงเหล่านี้ (เรียงตามตัวอักษร)
 */
export function NurseDecoyModal({ onClose }: { onClose: () => void }) {
  const [glands, setGlands] = useState("");
  const [hormones, setHormones] = useState("");
  const [loading, setLoading] = useState(true);
  // บันทึกได้เฉพาะเมื่อโหลดรายการเดิมสำเร็จ ไม่งั้นการกดบันทึกจะเขียนทับตัวลวงทั้งหมดด้วยค่าว่าง
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/nurse-choices", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "ไม่สามารถโหลดตัวลวงได้");
        }
        if (cancelled) return;
        setGlands(toLines(data.data.glands));
        setHormones(toLines(data.data.hormones));
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "ไม่สามารถโหลดตัวลวงได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loaded) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/nurse-choices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glands: fromLines(glands), hormones: fromLines(hormones) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถบันทึกตัวลวงได้");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถบันทึกตัวลวงได้");
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving || !loaded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ตัวลวงของสถานีพยาบาล</h3>
              <p className="text-xs text-slate-500">
                ตัวเลือกที่ไม่ใช่คำตอบของโรคใดเลย ไว้ให้นักเรียนพยาบาลเลือกผิด
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} autoComplete="off" className="mt-4 space-y-4">
          <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-[11px] font-medium leading-relaxed text-slate-600">
            พิมพ์ตัวลวงบรรทัดละ 1 รายการ · ตัวเลือกที่นักเรียนเห็นจะรวมเฉลยของทุกโรคกับตัวลวงเหล่านี้
            แล้วเรียงตามตัวอักษร จึงไม่มีลำดับที่บอกใบ้ว่าตัวไหนเป็นคำตอบจริง
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ต่อมไร้ท่อ (ตัวลวง)</label>
            <textarea
              rows={6}
              name="nurse_decoy_glands"
              placeholder={"ต่อมไพเนียล\nต่อมไทมัส"}
              value={glands}
              disabled={busy}
              onChange={(e) => setGlands(e.target.value)}
              className={textareaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ฮอร์โมน (ตัวลวง)</label>
            <textarea
              rows={9}
              name="nurse_decoy_hormones"
              placeholder={"Prolactin\nACTH"}
              value={hormones}
              disabled={busy}
              onChange={(e) => setHormones(e.target.value)}
              className={textareaClass}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกตัวลวง</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
