"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  KeyRound,
  Layers,
  RefreshCw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { formatPatientCode } from "@/lib/patient-code";
import {
  SCORE_MAXIMUMS,
  STAGE_CURRENT_STATION,
  STAGE_TONE,
  STATIONS,
  TONES,
  formatTime,
  scoreClasses,
  type StationKey,
  type SubmissionListItem,
} from "./shared";

type StepState = "done" | "current" | "pending" | "skipped";

/** ✓ / ✗ ต่อท้ายคำตอบ ไม่มีเฉลย = ไม่แสดง */
function Mark({ ok }: { ok: boolean | null | undefined }) {
  if (ok === true) return <Check aria-label="ถูกต้อง" className="inline h-3.5 w-3.5 text-emerald-600" />;
  if (ok === false) return <X aria-label="ไม่ถูกต้อง" className="inline h-3.5 w-3.5 text-rose-600" />;
  return null;
}

function correctnessText(ok: boolean | null | undefined) {
  return ok === false ? "text-rose-600" : ok === true ? "text-emerald-700" : "text-slate-800";
}

function ScorePill({
  score,
  maximum,
  icon,
}: {
  score: number | null | undefined;
  maximum: number;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-black tabular-nums ${scoreClasses(score, maximum)}`}
    >
      {icon}
      {typeof score === "number" ? score : "—"}/{maximum}
    </span>
  );
}

function StageChip({ sub }: { sub: SubmissionListItem }) {
  const tone = TONES[STAGE_TONE[sub.stage]];
  const live = sub.stage !== "COMPLETED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone.soft}`}
    >
      {sub.stage === "COMPLETED" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <span className="relative flex h-1.5 w-1.5">
          {live && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {sub.stageLabel}
    </span>
  );
}

function HeaderChips({ sub }: { sub: SubmissionListItem }) {
  const answerKey = sub.cardRoom.diseaseCode;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
        <Layers className="h-3 w-3 text-slate-400" />
        {sub.group.name}
      </span>

      {/* เฉลยรหัสโรคจากห้องบัตร (เห็นเฉพาะแอดมิน) */}
      {answerKey ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
          <KeyRound className="h-3 w-3 text-amber-600" />
          เฉลยรหัสโรค
          <span className="font-mono font-black underline decoration-amber-300 underline-offset-2">
            {answerKey}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-200 px-2 py-0.5 text-slate-400">
          <KeyRound className="h-3 w-3" />
          ไม่มีเฉลยรหัสโรค
        </span>
      )}

      {sub.doctor && sub.diagnosisEvaluation === "CORRECT" && (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          วินิจฉัยถูกต้อง (ตรงเฉลย)
        </span>
      )}
      {sub.doctor && sub.diagnosisEvaluation === "INCORRECT" && (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
          <XCircle className="h-3 w-3" />
          วินิจฉัยไม่ตรงเฉลย
        </span>
      )}
      {sub.doctor && sub.doctor.evaluationScore === null && (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-900">
          <AlertCircle className="h-3 w-3 text-amber-700" />
          AI ไม่พร้อมใช้งาน
        </span>
      )}
    </div>
  );
}

/** คะแนนรวมของคิว = ผลรวมคะแนนของสถานีที่ตรวจแล้ว */
function TotalScore({ sub }: { sub: SubmissionListItem }) {
  const parts = [
    sub.nurse?.evaluationScore,
    sub.lab?.evaluationScore,
    sub.doctor?.evaluationScore,
    sub.pharmacy?.evaluationScore,
  ].filter((score): score is number => typeof score === "number");
  if (parts.length === 0) return null;

  const total = parts.reduce((sum, score) => sum + score, 0);
  const percent = Math.min(100, (total / SCORE_MAXIMUMS.total) * 100);
  const bar = percent >= 70 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="w-full min-w-32 sm:w-36" aria-label="คะแนนรวม">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500">คะแนนรวม</span>
        <span className="font-mono text-sm font-black tabular-nums text-slate-900">
          {total}
          <span className="text-xs font-bold text-slate-400">/{SCORE_MAXIMUMS.total}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function getStepStates(sub: SubmissionListItem): Record<StationKey, StepState> {
  const hasRecord: Record<StationKey, boolean> = {
    card: true,
    nurse: !!sub.nurse,
    lab: !!sub.lab,
    doctor: !!sub.doctor,
    pharmacy: !!sub.pharmacy,
  };
  const current = STAGE_CURRENT_STATION[sub.stage];
  const lastDone = STATIONS.reduce((last, station, index) => (hasRecord[station.key] ? index : last), 0);

  const states = {} as Record<StationKey, StepState>;
  STATIONS.forEach((station, index) => {
    if (hasRecord[station.key]) states[station.key] = "done";
    else if (index < lastDone) states[station.key] = "skipped";
    else if (station.key === current) states[station.key] = "current";
    else states[station.key] = "pending";
  });
  return states;
}

function StepBody({ stationKey, sub }: { stationKey: StationKey; sub: SubmissionListItem }) {
  const line = "line-clamp-2 break-words text-[11px] leading-snug text-slate-500";

  if (stationKey === "card") {
    return <p className={line}>โดย {sub.cardRoom.clerkName}</p>;
  }

  if (stationKey === "nurse" && sub.nurse) {
    const { nurse } = sub;
    return (
      <>
        <p className={line}>โดย {nurse.nurseName}</p>
        <p className={line}>
          ความดัน {nurse.systolicBp}/{nurse.diastolicBp} · {nurse.pulseBpm} bpm
        </p>
        {nurse.evaluationScore !== null && (
          <ScorePill score={nurse.evaluationScore} maximum={SCORE_MAXIMUMS.nurse} />
        )}
      </>
    );
  }

  if (stationKey === "lab" && sub.lab) {
    const { lab } = sub;
    return (
      <>
        <p className={line}>โดย {lab.medTechName}</p>
        <p className={line} title={lab.panelDiseaseName}>
          {lab.panelDiseaseName} · {lab.itemCount} รายการ
        </p>
        <span className="flex flex-wrap items-center gap-1">
          {lab.evaluationScore !== null && (
            <ScorePill score={lab.evaluationScore} maximum={SCORE_MAXIMUMS.medTech} />
          )}
          {lab.isCorrect === null ? (
            <span className="text-[11px] font-semibold text-slate-400">ไม่มีเฉลย</span>
          ) : lab.isCorrect ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> ตรงเฉลย
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-700">
              <XCircle className="h-3 w-3" /> ไม่ตรงเฉลย
            </span>
          )}
        </span>
      </>
    );
  }

  if (stationKey === "doctor" && sub.doctor) {
    const { doctor } = sub;
    return (
      <>
        <p className={line}>โดย {doctor.doctorName}</p>
        <p className="line-clamp-2 break-words text-xs font-bold leading-snug text-sky-800" title={doctor.diseaseName}>
          {doctor.diseaseName}
        </p>
        {doctor.evaluationScore !== null ? (
          <ScorePill
            score={doctor.evaluationScore}
            maximum={SCORE_MAXIMUMS.doctor}
            icon={<Sparkles className="h-3 w-3" />}
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> AI ไม่พร้อมใช้งาน
          </span>
        )}
      </>
    );
  }

  if (stationKey === "pharmacy" && sub.pharmacy) {
    const { pharmacy } = sub;
    return (
      <>
        <p className={line}>โดย {pharmacy.pharmacistName}</p>
        {pharmacy.hormoneChoiceKey ? (
          <p className="text-[11px] font-bold leading-snug text-slate-700">
            ฮอร์โมน <span className={correctnessText(pharmacy.isHormoneCorrect)}>{pharmacy.hormoneChoiceKey}</span>
            <Mark ok={pharmacy.isHormoneCorrect} /> · ยา{" "}
            <span className={correctnessText(pharmacy.isTreatmentCorrect)}>{pharmacy.treatmentChoiceKey}</span>
            <Mark ok={pharmacy.isTreatmentCorrect} />
          </p>
        ) : (
          <p className={line}>จ่ายยาทั้งหมด {pharmacy.totalTablets ?? 0} เม็ด</p>
        )}
        {pharmacy.evaluationScore !== null && (
          <ScorePill score={pharmacy.evaluationScore} maximum={SCORE_MAXIMUMS.pharmacist} />
        )}
      </>
    );
  }

  return null;
}

function stationTime(stationKey: StationKey, sub: SubmissionListItem) {
  const source = {
    card: sub.cardRoom,
    nurse: sub.nurse,
    lab: sub.lab,
    doctor: sub.doctor,
    pharmacy: sub.pharmacy,
  }[stationKey];
  return source ? formatTime(source.createdAt) : null;
}

function Stepper({ sub }: { sub: SubmissionListItem }) {
  const states = getStepStates(sub);

  return (
    <ol className="grid gap-x-2 gap-y-4 border-t border-slate-100 px-4 py-4 sm:px-5 md:grid-cols-5">
      {STATIONS.map((station, index) => {
        const state = states[station.key];
        const tone = TONES[station.tone];
        const Icon = station.icon;
        const isLast = index === STATIONS.length - 1;
        const time = stationTime(station.key, sub);

        const nodeClass =
          state === "done"
            ? `${tone.solid} shadow-xs`
            : state === "current"
              ? `border-2 bg-white ${tone.border} ${tone.text}`
              : state === "skipped"
                ? "border border-dashed border-slate-300 bg-white text-slate-300"
                : "bg-slate-100 text-slate-400";

        return (
          <li key={station.key} className="relative flex gap-3 md:flex-col md:gap-2.5">
            {/* เส้นเชื่อมสถานี: แนวตั้งบนมือถือ / แนวนอนบนจอกว้าง */}
            {!isLast && (
              <>
                <span
                  aria-hidden
                  className={`absolute left-4 top-9 -bottom-4 w-0.5 -translate-x-1/2 rounded-full md:hidden ${
                    state === "done" ? tone.bar : "bg-slate-200"
                  }`}
                />
                <span
                  aria-hidden
                  className={`absolute left-11 right-[-0.5rem] top-4 hidden h-0.5 -translate-y-1/2 rounded-full md:block ${
                    state === "done" ? tone.bar : "bg-slate-200"
                  }`}
                />
              </>
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${nodeClass}`}
            >
              {state === "current" && (
                <span
                  className={`absolute inset-0 animate-ping rounded-full border-2 opacity-40 ${tone.border}`}
                />
              )}
              <Icon className="relative h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1 space-y-0.5">
              <p
                className={`text-xs font-bold leading-snug ${
                  state === "done" || state === "current" ? tone.text : "text-slate-400"
                }`}
              >
                {index + 1}. {station.label}
                {time && (
                  <span className="ml-1.5 whitespace-nowrap text-[11px] font-medium tabular-nums text-slate-400">{time} น.</span>
                )}
              </p>

              {state === "done" ? (
                <div className="space-y-1">
                  <StepBody stationKey={station.key} sub={sub} />
                </div>
              ) : state === "current" ? (
                <p className={`text-[11px] font-semibold ${tone.text}`}>กำลังรอดำเนินการ…</p>
              ) : state === "skipped" ? (
                <p className="text-[11px] text-slate-400">ไม่มีข้อมูลสถานีนี้</p>
              ) : (
                <p className="text-[11px] text-slate-400">ยังมาไม่ถึง</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

function DetailPanel({
  stationKey,
  filled,
  emptyText,
  children,
}: {
  stationKey: StationKey;
  filled: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  const station = STATIONS.find((s) => s.key === stationKey)!;
  const tone = TONES[station.tone];
  const Icon = station.icon;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <h4 className={`mb-2 flex items-center gap-1.5 text-xs font-bold ${filled ? tone.text : "text-slate-400"}`}>
        <Icon className="h-3.5 w-3.5" />
        {station.label}
      </h4>
      {filled ? (
        <dl className="space-y-1.5">{children}</dl>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-xs italic text-slate-400">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function Details({ sub }: { sub: SubmissionListItem }) {
  const { nurse, lab, doctor, pharmacy } = sub;
  return (
    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-4">
      <DetailPanel stationKey="nurse" filled={!!nurse} emptyText="รอสถานีพยาบาลซักประวัติ...">
        {nurse && (
          <>
            {nurse.endocrineGlandChoice && (
              <>
                <DetailRow label="ต่อมไร้ท่อ">
                  <span className={correctnessText(nurse.isGlandCorrect)}>
                    {nurse.endocrineGlandChoice} <Mark ok={nurse.isGlandCorrect} />
                  </span>
                </DetailRow>
                <DetailRow label="ฮอร์โมน">
                  <span className={correctnessText(nurse.isHormoneCorrect)}>
                    {nurse.abnormalHormoneChoice} <Mark ok={nurse.isHormoneCorrect} />
                  </span>
                </DetailRow>
              </>
            )}
            <div className="border-t border-slate-200/70 pt-1.5 text-xs">
              <dt className="text-slate-400">อาการ</dt>
              <dd className="mt-0.5 line-clamp-3 font-medium text-slate-700">{nurse.symptomDescription}</dd>
            </div>
          </>
        )}
      </DetailPanel>

      <DetailPanel stationKey="lab" filled={!!lab} emptyText="รอเทคนิคการแพทย์ส่งผลตรวจ...">
        {lab && (
          <>
            <DetailRow label="ชุดผลตรวจ">{lab.panelDiseaseName}</DetailRow>
            <DetailRow label="จำนวน">{lab.itemCount} รายการ</DetailRow>
            <DetailRow label="เทียบเฉลย">
              {lab.isCorrect === null ? (
                <span className="text-slate-400">ไม่มีเฉลย</span>
              ) : lab.isCorrect ? (
                <span className="text-emerald-700">ตรงเฉลย</span>
              ) : (
                <span className="text-rose-700">ไม่ตรงเฉลย</span>
              )}
            </DetailRow>
          </>
        )}
      </DetailPanel>

      <DetailPanel stationKey="doctor" filled={!!doctor} emptyText="รอแพทย์ตรวจวินิจฉัย...">
        {doctor && (
          <>
            <DetailRow label="โรคที่วินิจฉัย">{doctor.diseaseName}</DetailRow>
            {doctor.aiModel && (
              <DetailRow label="โมเดล AI">
                <span className="font-mono text-[11px] text-slate-500">{doctor.aiModel}</span>
              </DetailRow>
            )}
            <div className="border-t border-slate-200/70 pt-1.5 text-xs">
              <dt className="text-slate-400">ผลการวินิจฉัย</dt>
              <dd className="mt-0.5 line-clamp-3 font-medium text-slate-700">{doctor.doctorDiagnosis}</dd>
            </div>
          </>
        )}
      </DetailPanel>

      <DetailPanel stationKey="pharmacy" filled={!!pharmacy} emptyText="รอสถานีห้องยาจ่ายยา...">
        {pharmacy &&
          (pharmacy.hormoneChoiceKey ? (
            <>
              <DetailRow label="ฮอร์โมน">
                <span className={correctnessText(pharmacy.isHormoneCorrect)}>
                  {pharmacy.hormoneChoiceKey} <Mark ok={pharmacy.isHormoneCorrect} />
                </span>
              </DetailRow>
              <DetailRow label="ยา/การรักษา">
                <span className={correctnessText(pharmacy.isTreatmentCorrect)}>
                  {pharmacy.treatmentChoiceKey} <Mark ok={pharmacy.isTreatmentCorrect} />
                </span>
              </DetailRow>
            </>
          ) : (
            <DetailRow label="จ่ายยาทั้งหมด">{pharmacy.totalTablets ?? 0} เม็ด</DetailRow>
          ))}
      </DetailPanel>
    </div>
  );
}

export function CaseCard({
  sub,
  expanded,
  onToggle,
  onOpen,
  opening,
  openingDisabled,
}: {
  sub: SubmissionListItem;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  opening: boolean;
  openingDisabled: boolean;
}) {
  const { patient } = sub;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:p-5">
        {/* รหัสผู้ป่วย */}
        <div
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl shadow-xs ${
            sub.stage === "COMPLETED" ? "bg-slate-800 text-white" : "bg-red-600 text-white"
          }`}
          title={`รหัสผู้ป่วย ${formatPatientCode(sub.queueNumber)}`}
        >
          <span className="text-[10px] font-semibold leading-none opacity-80">รหัส</span>
          <span className="mt-0.5 text-xl font-black leading-none tabular-nums">
            {formatPatientCode(sub.queueNumber)}
          </span>
        </div>

        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="min-w-0 truncate text-base font-bold text-slate-900">{patient.fullName}</h3>
            <StageChip sub={sub} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            อายุ {patient.age} ปี · เพศ {patient.gender} · สถานภาพ {patient.maritalStatus}
          </p>
          <HeaderChips sub={sub} />
        </div>

        <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
          <TotalScore sub={sub} />
          <button
            type="button"
            onClick={onOpen}
            disabled={openingDisabled}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {opening ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-slate-500" />
            )}
            {opening ? "กำลังโหลด..." : "ดูบันทึกฉบับเต็ม"}
          </button>
        </div>
      </div>

      <Stepper sub={sub} />

      {expanded && <Details sub={sub} />}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-slate-100 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        {expanded ? "ซ่อนรายละเอียดแต่ละสถานี" : "ดูรายละเอียดแต่ละสถานี"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </article>
  );
}
