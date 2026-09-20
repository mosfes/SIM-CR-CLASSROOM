import { CheckCircle2 } from "lucide-react";
import { STAGE_TONE, TONES, type SubmissionStage } from "./shared";

/** ป้ายสถานะของคิว — คิวที่ยังไม่จบจะมีจุดกะพริบ */
export function StageChip({ stage, label }: { stage: SubmissionStage; label: string }) {
  const tone = TONES[STAGE_TONE[stage]];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone.soft}`}
    >
      {stage === "COMPLETED" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
