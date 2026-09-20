import { Microscope } from "lucide-react";

type NurseAnalysisTone = "indigo" | "sky" | "teal";

// class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
const TONES: Record<NurseAnalysisTone, { card: string; heading: string; chip: string }> = {
  indigo: {
    card: "border-indigo-100",
    heading: "text-indigo-700",
    chip: "border-indigo-100 bg-indigo-50/60",
  },
  sky: {
    card: "border-sky-100",
    heading: "text-sky-700",
    chip: "border-sky-100 bg-sky-50/60",
  },
  teal: {
    card: "border-teal-200",
    heading: "text-teal-700",
    chip: "border-teal-100 bg-teal-50/70",
  },
};

/**
 * คำตอบของพยาบาลที่ส่งต่อมาให้สถานีถัดไป: ต่อมไร้ท่อและฮอร์โมนที่พยาบาลเห็นว่าผิดปกติ
 * แสดงเฉพาะสิ่งที่พยาบาลเลือก ไม่บอกว่าถูกหรือผิด สถานีถัดไปต้องวิเคราะห์เอง
 * ไม่แสดงอะไรถ้าเคสนี้ไม่มีคำตอบ (เช่น เคสเก่าก่อนมีตัวเลือก)
 */
export function NurseAnalysisCard({
  gland,
  hormone,
  tone,
}: {
  gland: string | null | undefined;
  hormone: string | null | undefined;
  tone: NurseAnalysisTone;
}) {
  if (!gland && !hormone) return null;
  const t = TONES[tone];

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${t.card}`}>
      <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider ${t.heading}`}>
        <span className="flex items-center gap-2">
          <Microscope className="h-4 w-4" />
          คำตอบของพยาบาล
        </span>
        <span className="text-[11px] font-semibold normal-case tracking-normal text-slate-400">
          ความเห็นของพยาบาล อาจถูกหรือผิดก็ได้
        </span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className={`rounded-xl border p-2.5 ${t.chip}`}>
          <span className="block text-xs font-semibold text-slate-400">ต่อมไร้ท่อที่ผิดปกติ</span>
          <span className="font-bold text-slate-800">{gland || "—"}</span>
        </div>
        <div className={`rounded-xl border p-2.5 ${t.chip}`}>
          <span className="block text-xs font-semibold text-slate-400">ฮอร์โมนที่ผิดปกติ</span>
          <span className="font-bold text-slate-800">{hormone || "—"}</span>
        </div>
      </div>
    </div>
  );
}
