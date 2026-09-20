"use client";

import { CheckCircle2, ChevronRight, type LucideIcon } from "lucide-react";
import {
  STATIONS,
  TONES,
  type Metrics,
  type StationKey,
  type SubmissionStage,
  type Tone,
} from "./shared";

interface StageTile {
  stage: SubmissionStage;
  label: string;
  hint: string;
  tone: Tone;
  icon: LucideIcon;
  count: (metrics: Metrics) => number;
}

function stationIcon(key: StationKey) {
  return STATIONS.find((station) => station.key === key)!.icon;
}

const STAGE_TILES: readonly StageTile[] = [
  {
    stage: "WAITING_NURSE",
    label: "รอซักประวัติ",
    hint: "อยู่ที่ห้องบัตร",
    tone: "emerald",
    icon: stationIcon("nurse"),
    count: (m) => m.waitingNurseCount,
  },
  {
    stage: "WAITING_LAB",
    label: "รอผลแล็บ",
    hint: "อยู่ที่เทคนิคการแพทย์",
    tone: "indigo",
    icon: stationIcon("lab"),
    count: (m) => m.waitingLabCount,
  },
  {
    stage: "WAITING_DOCTOR",
    label: "รอตรวจวินิจฉัย",
    hint: "ส่งต่อให้แพทย์",
    tone: "sky",
    icon: stationIcon("doctor"),
    count: (m) => m.waitingDoctorCount,
  },
  {
    stage: "WAITING_PHARMACY",
    label: "รอจ่ายยา",
    hint: "ส่งต่อไปห้องยา",
    tone: "fuchsia",
    icon: stationIcon("pharmacy"),
    count: (m) => m.waitingPharmacyCount,
  },
  {
    stage: "COMPLETED",
    label: "เสร็จสิ้นรอบรักษา",
    hint: "จ่ายยาเรียบร้อย",
    tone: "slate",
    icon: CheckCircle2,
    count: (m) => m.completedCount,
  },
];

// class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
const ACTIVE_RING: Record<Tone, string> = {
  amber: "border-amber-400 ring-2 ring-amber-200",
  emerald: "border-emerald-400 ring-2 ring-emerald-200",
  indigo: "border-indigo-400 ring-2 ring-indigo-200",
  sky: "border-sky-400 ring-2 ring-sky-200",
  fuchsia: "border-fuchsia-400 ring-2 ring-fuchsia-200",
  slate: "border-slate-500 ring-2 ring-slate-200",
};

function AccuracyRing({ rate, hasData }: { rate: number; hasData: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, rate));
  const stroke = !hasData
    ? "stroke-slate-200"
    : clamped >= 70
      ? "stroke-emerald-500"
      : clamped >= 40
        ? "stroke-amber-500"
        : "stroke-rose-500";

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="7" className="stroke-slate-100" />
        {hasData && (
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            className={`${stroke} transition-[stroke-dashoffset] duration-500`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums text-slate-900">
        {hasData ? `${clamped}%` : "-"}
      </span>
    </div>
  );
}

export function MonitorOverview({
  metrics,
  stageFilter,
  onStageChange,
}: {
  metrics: Metrics;
  stageFilter: string;
  onStageChange: (stage: string) => void;
}) {
  const hasDiagnosed = metrics.diagnosedCount > 0;

  return (
    <section
      aria-label="ภาพรวมสถานะคิว"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="grid xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* ตัวเลขภาพรวม */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 xl:grid-cols-1 xl:divide-x-0 xl:divide-y xl:border-b-0 xl:border-r">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-500">คิวทั้งหมด</p>
            <p className="mt-1 text-4xl font-black leading-none tabular-nums text-slate-900">
              {metrics.totalCases}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400">เคสที่ออกบัตรแล้ว</p>
          </div>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <AccuracyRing rate={metrics.accuracyRate} hasData={hasDiagnosed} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">ความแม่นยำวินิจฉัย</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                <span className="font-bold text-slate-700">{metrics.correctDiagnosesCount}</span>/
                {metrics.diagnosedCount} เคสถูกต้อง
              </p>
            </div>
          </div>
        </div>

        {/* pipeline ตามสถานะ — คลิกเพื่อกรองรายการ */}
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">สถานะคิวตามขั้นตอน</h2>
            <span className="text-[11px] text-slate-400">คลิกเพื่อกรองรายการ</span>
          </div>

          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {STAGE_TILES.map((tile, index) => {
              const tone = TONES[tile.tone];
              const count = tile.count(metrics);
              const active = stageFilter === tile.stage;
              const Icon = tile.icon;
              return (
                <li key={tile.stage} className="relative">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onStageChange(active ? "ALL" : tile.stage)}
                    className={`flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all hover:-translate-y-px hover:shadow-sm ${
                      active ? `${ACTIVE_RING[tile.tone]} bg-white` : "border-slate-200 bg-slate-50/60 hover:bg-white"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.solid}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-2xl font-black leading-none tabular-nums text-slate-900">
                        {count}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-xs font-bold ${tone.text}`}>
                        {tile.label}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">{tile.hint}</span>
                    </span>
                  </button>
                  {index < STAGE_TILES.length - 1 && (
                    <ChevronRight
                      aria-hidden
                      className="absolute -right-[9px] top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-slate-300 xl:block"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* แถบสัดส่วนคิวในแต่ละขั้น */}
          {metrics.totalCases > 0 && (
            <div
              className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label="สัดส่วนคิวในแต่ละขั้นตอน"
            >
              {STAGE_TILES.map((tile) => {
                const count = tile.count(metrics);
                if (count <= 0) return null;
                return (
                  <div
                    key={tile.stage}
                    title={`${tile.label}: ${count}`}
                    className={`${TONES[tile.tone].bar} transition-all first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${(count / metrics.totalCases) * 100}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
