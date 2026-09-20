import { Trophy } from "lucide-react";

export interface GroupResults {
  diagnosedCount: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  labCount: number;
  labCorrectCount: number;
  labWrongCount: number;
  labSuccessRate: number;
  pharmacyCount: number;
  pharmacyCorrectCount: number;
  pharmacyWrongCount: number;
  pharmacySuccessRate: number;
  doctorScore: number;
  labScore: number;
  pharmacyScore: number;
  totalScore: number;
  topScorers: Array<{ studentId: string; name: string; score: number }>;
}

export interface ResultsSummaryTheme {
  secondary: string;
  stat: string;
  item: string;
  faint: string;
}

export const CHART_CORRECT_COLOR = "#34d399";
export const CHART_WRONG_COLOR = "#fb7185";

export const GROUP_ACCENTS = [
  { badge: "bg-amber-400 text-amber-950", ring: "ring-amber-300/60" },
  { badge: "bg-emerald-400 text-emerald-950", ring: "ring-emerald-300/60" },
  { badge: "bg-sky-400 text-sky-950", ring: "ring-sky-300/60" },
  { badge: "bg-fuchsia-400 text-fuchsia-950", ring: "ring-fuchsia-300/60" },
  { badge: "bg-indigo-400 text-indigo-950", ring: "ring-indigo-300/60" },
  { badge: "bg-rose-400 text-rose-950", ring: "ring-rose-300/60" },
];

export const RANK_BADGES = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
];

export function OverallResultsDonut({
  correct,
  wrong,
  themeStyles,
}: {
  correct: number;
  wrong: number;
  themeStyles: ResultsSummaryTheme;
}) {
  const total = correct + wrong;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const correctLength = total > 0 ? (correct / total) * circumference : 0;
  const wrongLength = total > 0 ? (wrong / total) * circumference : 0;
  const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-4">
      <svg viewBox="0 0 100 100" width="112" height="112" role="img" aria-label={`อัตราวินิจฉัยถูกต้องรวม ${successRate} เปอร์เซ็นต์`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-400/25" />
        {total > 0 && (
          <>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={CHART_CORRECT_COLOR}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${correctLength} ${circumference - correctLength}`}
              transform="rotate(-90 50 50)"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={CHART_WRONG_COLOR}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${wrongLength} ${circumference - wrongLength}`}
              strokeDashoffset={-correctLength}
              transform="rotate(-90 50 50)"
            />
          </>
        )}
        <text x="50" y="47" textAnchor="middle" className="fill-current text-[22px] font-black">
          {successRate}%
        </text>
        <text x="50" y="64" textAnchor="middle" className={`fill-current text-[9px] font-bold ${themeStyles.secondary}`}>
          สำเร็จรวม
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 text-sm font-bold">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_CORRECT_COLOR }} />
          แพทย์ตอบถูก {correct} ครั้ง
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_WRONG_COLOR }} />
          แพทย์ตอบผิด {wrong} ครั้ง
        </span>
      </div>
    </div>
  );
}

export function GroupScoreLeaderboard({
  bars,
  themeStyles,
}: {
  bars: Array<{
    id: string;
    name: string;
    score: number;
    successRate: number;
    correctCount: number;
    wrongCount: number;
    doctorScore: number;
    labCorrectCount: number;
    labWrongCount: number;
    labScore: number;
    pharmacyCorrectCount: number;
    pharmacyWrongCount: number;
    pharmacyScore: number;
    accentBadge: string;
  }>;
  themeStyles: ResultsSummaryTheme;
}) {
  const maxScore = Math.max(1, ...bars.map((bar) => bar.score));

  return (
    <div className="flex flex-1 flex-col gap-3">
      {bars.map((bar) => (
        <div key={bar.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm font-bold sm:w-32">{bar.name}</span>
            <div className={`h-6 min-w-0 flex-1 overflow-hidden rounded-full ${themeStyles.stat}`}>
              <div
                className={`flex h-full items-center justify-end rounded-full px-2 text-xs font-black ${bar.accentBadge}`}
                style={{ width: `${Math.max(8, (bar.score / maxScore) * 100)}%` }}
              >
                {bar.score} คะแนน
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${themeStyles.stat} ${themeStyles.secondary}`}>
              แม่นยำ {bar.successRate}%
            </span>
          </div>
          <div className={`grid grid-cols-1 gap-x-4 gap-y-0.5 pl-[calc(6rem+0.75rem)] text-[11px] font-semibold sm:grid-cols-2 sm:pl-[calc(8rem+0.75rem)] ${themeStyles.secondary}`}>
            <span>
              แพทย์: ถูก <span style={{ color: CHART_CORRECT_COLOR }}>{bar.correctCount}</span> ผิด{" "}
              <span style={{ color: CHART_WRONG_COLOR }}>{bar.wrongCount}</span> · {bar.doctorScore} คะแนน
            </span>
            <span>
              เทคนิคการแพทย์: ถูก <span style={{ color: CHART_CORRECT_COLOR }}>{bar.labCorrectCount}</span> ผิด{" "}
              <span style={{ color: CHART_WRONG_COLOR }}>{bar.labWrongCount}</span> · {bar.labScore} คะแนน
            </span>
            <span>
              เภสัชกร: ถูกครบ <span style={{ color: CHART_CORRECT_COLOR }}>{bar.pharmacyCorrectCount}</span> ไม่ครบ{" "}
              <span style={{ color: CHART_WRONG_COLOR }}>{bar.pharmacyWrongCount}</span> · {bar.pharmacyScore} คะแนน
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupResultsSummaryCard({
  results,
  themeStyles,
}: {
  results: GroupResults;
  themeStyles: ResultsSummaryTheme;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-amber-400 px-2 py-3 text-center text-amber-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-950/70">คะแนนรวมทีม</p>
          <p className="mt-1 text-2xl font-black">{results.totalScore}</p>
        </div>
        <div className={`rounded-2xl px-2 py-3 text-center ${themeStyles.stat}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${themeStyles.secondary}`}>แพทย์</p>
          <p className="mt-1 text-2xl font-black">{results.doctorScore}</p>
        </div>
        <div className={`rounded-2xl px-2 py-3 text-center ${themeStyles.stat}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${themeStyles.secondary}`}>เทคนิคการแพทย์</p>
          <p className="mt-1 text-2xl font-black">{results.labScore}</p>
        </div>
        <div className={`rounded-2xl px-2 py-3 text-center ${themeStyles.stat}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${themeStyles.secondary}`}>เภสัชกร</p>
          <p className="mt-1 text-2xl font-black">{results.pharmacyScore}</p>
        </div>
      </div>

      <div>
        <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${themeStyles.secondary}`}>
          <Trophy className="h-3.5 w-3.5 text-amber-400" /> ท็อป 3 คะแนนสูงสุด
        </p>
        {results.topScorers.length === 0 ? (
          <p className={`mt-2 text-xs ${themeStyles.faint}`}>ยังไม่มีคะแนนในห้องตรวจนี้</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {results.topScorers.map((scorer, rankIndex) => (
              <div key={scorer.studentId} className={`flex items-center justify-between rounded-xl px-3 py-2 ${themeStyles.item}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${RANK_BADGES[rankIndex]}`}>{rankIndex + 1}</span>
                  <span className="truncate text-sm font-bold">{scorer.name}</span>
                </span>
                <span className="shrink-0 text-sm font-black">{scorer.score} คะแนน</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
