import { Crown, DoorOpen, FlaskConical, HeartPulse, Medal, Pill, Stethoscope, Trophy, type LucideIcon } from "lucide-react";
import { RANK_BADGES, type GroupResults } from "@/components/projector/results-summary";

type RoleKey = "nurse" | "doctor" | "lab" | "pharmacy";

interface RoleMetric {
  key: RoleKey;
  label: string;
  correctLabel: string;
  wrongLabel: string;
  icon: LucideIcon;
  bar: string;
  tint: string;
}

const ROLE_METRICS: RoleMetric[] = [
  { key: "nurse", label: "พยาบาล", correctLabel: "ถูกครบ", wrongLabel: "ไม่ครบ", icon: HeartPulse, bar: "bg-emerald-500", tint: "bg-emerald-50 text-emerald-600" },
  { key: "doctor", label: "แพทย์", correctLabel: "ถูก", wrongLabel: "ผิด", icon: Stethoscope, bar: "bg-sky-500", tint: "bg-sky-50 text-sky-600" },
  { key: "lab", label: "เทคนิคการแพทย์", correctLabel: "ถูก", wrongLabel: "ผิด", icon: FlaskConical, bar: "bg-indigo-500", tint: "bg-indigo-50 text-indigo-600" },
  { key: "pharmacy", label: "เภสัชกร", correctLabel: "ถูกครบ", wrongLabel: "ไม่ครบ", icon: Pill, bar: "bg-fuchsia-500", tint: "bg-fuchsia-50 text-fuchsia-600" },
];

interface RoleStat {
  score: number;
  correct: number;
  wrong: number;
}

function getRoleStat(results: GroupResults | null, key: RoleKey): RoleStat {
  if (!results) return { score: 0, correct: 0, wrong: 0 };
  if (key === "nurse") return { score: results.nurseScore, correct: results.nurseCorrectCount, wrong: results.nurseWrongCount };
  if (key === "doctor") return { score: results.doctorScore, correct: results.correctCount, wrong: results.wrongCount };
  if (key === "lab") return { score: results.labScore, correct: results.labCorrectCount, wrong: results.labWrongCount };
  return { score: results.pharmacyScore, correct: results.pharmacyCorrectCount, wrong: results.pharmacyWrongCount };
}

function getAccuracy(correct: number, wrong: number) {
  const total = correct + wrong;
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

// Equal scores share a rank (1, 1, 3, ...).
function withRanks<T>(items: T[], getScore: (item: T) => number) {
  return items.map((item) => ({
    ...item,
    rank: items.findIndex((other) => getScore(other) === getScore(item)) + 1,
  }));
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${RANK_BADGES[rank - 1] ?? "bg-slate-100 text-slate-500"}`}
    >
      {rank}
    </span>
  );
}

function OutcomeBar({ correct, wrong, className = "" }: { correct: number; wrong: number; className?: string }) {
  const total = correct + wrong;
  return (
    <div className={`flex h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`} aria-hidden="true">
      {total > 0 && (
        <>
          <div className="bg-emerald-400" style={{ width: `${(correct / total) * 100}%` }} />
          <div className="bg-rose-400" style={{ width: `${(wrong / total) * 100}%` }} />
        </>
      )}
    </div>
  );
}

function AccuracyRing({ correct, wrong }: { correct: number; wrong: number }) {
  const total = correct + wrong;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const correctLength = total > 0 ? (correct / total) * circumference : 0;
  const wrongLength = total > 0 ? (wrong / total) * circumference : 0;
  const rate = getAccuracy(correct, wrong);

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0" role="img" aria-label={rate === null ? "ยังไม่มีข้อมูลความแม่นยำ" : `ตอบถูกรวม ${rate} เปอร์เซ็นต์`}>
      <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-slate-200" />
      {total > 0 && (
        <g transform="rotate(-90 50 50)" fill="none" strokeWidth="12">
          <circle cx="50" cy="50" r={radius} className="stroke-emerald-400" strokeDasharray={`${correctLength} ${circumference - correctLength}`} />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-rose-400"
            strokeDasharray={`${wrongLength} ${circumference - wrongLength}`}
            strokeDashoffset={-correctLength}
          />
        </g>
      )}
      <text x="50" y="57" textAnchor="middle" className="fill-slate-800 text-[24px] font-black">
        {rate === null ? "-" : `${rate}%`}
      </text>
    </svg>
  );
}

export interface SimulationResultsGroup {
  id: string;
  name: string;
  results: GroupResults | null;
}

export function SimulationResultsSummary({
  groups,
  subtitle,
}: {
  groups: SimulationResultsGroup[];
  subtitle: string;
}) {
  const ranked = withRanks(
    groups
      .map((group) => ({
        id: group.id,
        name: group.name,
        results: group.results,
        totalScore: group.results?.totalScore ?? 0,
        roles: ROLE_METRICS.map((metric) => ({ metric, ...getRoleStat(group.results, metric.key) })),
      }))
      .sort((a, b) => b.totalScore - a.totalScore),
    (group) => group.totalScore
  );

  const roleTotals = ROLE_METRICS.map((metric, index) => ({
    metric,
    score: ranked.reduce((sum, group) => sum + group.roles[index].score, 0),
    correct: ranked.reduce((sum, group) => sum + group.roles[index].correct, 0),
    wrong: ranked.reduce((sum, group) => sum + group.roles[index].wrong, 0),
  }));
  const totalScore = roleTotals.reduce((sum, role) => sum + role.score, 0);
  const totalCorrect = roleTotals.reduce((sum, role) => sum + role.correct, 0);
  const totalWrong = roleTotals.reduce((sum, role) => sum + role.wrong, 0);

  const topScore = ranked[0]?.totalScore ?? 0;
  const winners = topScore > 0 ? ranked.filter((group) => group.rank === 1) : [];
  const runnerUp = ranked.find((group) => group.rank > 1);
  const lead = winners.length === 1 && runnerUp ? topScore - runnerUp.totalScore : null;

  const topPlayers = withRanks(
    ranked
      .flatMap((group) =>
        (group.results?.topScorers ?? []).map((scorer) => ({ ...scorer, key: `${group.id}-${scorer.studentId}`, groupName: group.name }))
      )
      .filter((player) => player.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    (player) => player.score
  );

  return (
    <section className="@container rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">สรุปผลรอบจำลอง</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
      </header>

      <div className="grid gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 @xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-center sm:p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
            <Crown className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              {winners.length > 1 ? "คะแนนสูงสุด · เสมอกัน" : "ห้องตรวจคะแนนสูงสุด"}
            </p>
            {winners.length > 0 ? (
              <>
                <p className="mt-0.5 break-words text-xl font-black text-slate-900 @xl:text-2xl">{winners.map((group) => group.name).join(" · ")}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-500">
                  <span className="font-black text-amber-600">{topScore}</span> คะแนน
                  {lead !== null && lead > 0 && <span className="text-slate-400"> · นำอันดับ 2 อยู่ {lead} คะแนน</span>}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-500">ยังไม่มีคะแนนในรอบนี้</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 border-t border-amber-100 pt-4 @xl:border-l @xl:border-t-0 @xl:pl-6 @xl:pt-0">
          <div>
            <p className="text-[11px] font-bold text-slate-400">คะแนนรวมทุกห้อง</p>
            <p className="mt-0.5 text-3xl font-black leading-none text-slate-900">{totalScore}</p>
          </div>
          <div className="flex items-center gap-3">
            <AccuracyRing correct={totalCorrect} wrong={totalWrong} />
            <div className="text-[11px] font-semibold leading-relaxed text-slate-500">
              <p className="font-bold text-slate-700">ตอบถูกรวม</p>
              <p>
                {totalCorrect} จาก {totalCorrect + totalWrong} ครั้ง
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 @md:grid-cols-2 @3xl:grid-cols-4">
        {roleTotals.map(({ metric, score, correct, wrong }) => {
          const Icon = metric.icon;
          const accuracy = getAccuracy(correct, wrong);
          return (
            <div key={metric.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.tint}`}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <p className="text-xs font-bold text-slate-500">{metric.label}</p>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="text-3xl font-black leading-none text-slate-900">
                  {score}
                  <span className="ml-1 text-xs font-bold text-slate-400">คะแนน</span>
                </p>
                <p className="text-sm font-black text-slate-500">{accuracy === null ? "-" : `${accuracy}%`}</p>
              </div>
              <OutcomeBar correct={correct} wrong={wrong} className="mt-3" />
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                {metric.correctLabel} <span className="font-black text-emerald-600">{correct}</span> · {metric.wrongLabel}{" "}
                <span className="font-black text-rose-600">{wrong}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h3 className="text-sm font-black text-slate-900">อันดับคะแนนรายห้องตรวจ</h3>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
              {ROLE_METRICS.map((metric) => (
                <li key={metric.key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${metric.bar}`} aria-hidden="true" />
                  {metric.label}
                </li>
              ))}
            </ul>
          </div>
          <ol className="mt-4 space-y-3.5">
            {ranked.map((group) => (
              <li key={group.id} className="flex items-center gap-3">
                <RankBadge rank={group.rank} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-800">{group.name}</span>
                    <span className="shrink-0 text-sm font-black text-slate-900">
                      {group.totalScore} <span className="text-[11px] font-semibold text-slate-400">คะแนน</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    {group.totalScore > 0 && (
                      <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${Math.max(4, (group.totalScore / topScore) * 100)}%` }}>
                        {group.roles
                          .filter((role) => role.score > 0)
                          .map((role) => (
                            <div
                              key={role.metric.key}
                              className={role.metric.bar}
                              style={{ flex: `${role.score} 1 0%` }}
                              title={`${role.metric.label} ${role.score} คะแนน`}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-100 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <Medal className="h-4 w-4 text-amber-500" aria-hidden="true" /> ผู้เล่นคะแนนสูงสุด
          </h3>
          {topPlayers.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">ยังไม่มีคะแนนรายบุคคลในรอบนี้</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {topPlayers.map((player) => (
                <li key={player.key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <RankBadge rank={player.rank} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{player.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{player.groupName}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-slate-900">{player.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <h3 className="mb-3 mt-6 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">รายละเอียดแต่ละห้องตรวจ</h3>
      <div className="grid gap-3 @xl:grid-cols-2">
        {ranked.map((group) => (
          <article key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <header className="flex items-center gap-3">
              <RankBadge rank={group.rank} />
              <h4 className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-black text-slate-900">
                <DoorOpen className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                <span className="truncate">{group.name}</span>
              </h4>
              <p className="shrink-0 text-xl font-black leading-none text-slate-900">
                {group.totalScore}
                <span className="ml-1 text-[11px] font-bold text-slate-400">คะแนน</span>
              </p>
            </header>

            {group.results ? (
              <>
                <div className="mt-4 space-y-3.5">
                  {group.roles.map(({ metric, score, correct, wrong }) => {
                    const Icon = metric.icon;
                    const accuracy = getAccuracy(correct, wrong);
                    return (
                      <div key={metric.key}>
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${metric.tint}`}>
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-700">{metric.label}</p>
                            <p className="truncate text-[11px] font-semibold text-slate-500">
                              {metric.correctLabel} <span className="font-black text-emerald-600">{correct}</span> · {metric.wrongLabel}{" "}
                              <span className="font-black text-rose-600">{wrong}</span>
                              {accuracy !== null && <span className="text-slate-400"> · {accuracy}%</span>}
                            </p>
                          </div>
                          <p className="shrink-0 text-base font-black text-slate-900">{score}</p>
                        </div>
                        <OutcomeBar correct={correct} wrong={wrong} className="mt-1.5" />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" /> ท็อป 3 คะแนนสูงสุด
                  </p>
                  {group.results.topScorers.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">ยังไม่มีคะแนนในห้องตรวจนี้</p>
                  ) : (
                    <ol className="mt-2 space-y-1.5">
                      {group.results.topScorers.map((scorer, index) => (
                        <li key={scorer.studentId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${RANK_BADGES[index]}`}>{index + 1}</span>
                            <span className="truncate text-sm font-bold text-slate-800">{scorer.name}</span>
                          </span>
                          <span className="shrink-0 text-sm font-black text-slate-900">{scorer.score}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-400">ไม่มีข้อมูลผลลัพธ์</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
