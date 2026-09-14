"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  FlaskConical,
  Maximize2,
  Minimize2,
  Moon,
  HeartPulse,
  IdCard,
  Pill,
  Play,
  LoaderCircle,
  Square,
  Sun,
  Stethoscope,
} from "lucide-react";
import { getPlayRole, type PlayRole, type PlayRoleId } from "@/lib/play/roles";
import { RoomQrCode } from "@/components/play/room-qr-code";
import { SoundToggle } from "@/components/play/sound-toggle";
import { startMusic, stopMusic } from "@/lib/play/sound";
import {
  GROUP_ACCENTS,
  GroupResultsSummaryCard,
  GroupScoreLeaderboard,
  OverallResultsDonut,
  type GroupResults,
} from "@/components/projector/results-summary";

type SessionStatus = "LOBBY" | "RUNNING" | "ENDED";
type ProjectorTheme = "dark" | "light";

const PROJECTOR_THEME_STORAGE_KEY = "simclassroom-projector-theme";
const PROJECTOR_THEME_LISTENERS = new Set<() => void>();

function getStoredProjectorTheme(): ProjectorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(PROJECTOR_THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function subscribeToProjectorTheme(listener: () => void) {
  PROJECTOR_THEME_LISTENERS.add(listener);

  if (typeof window === "undefined") {
    return () => PROJECTOR_THEME_LISTENERS.delete(listener);
  }

  const onStorageChange = (event: StorageEvent) => {
    if (event.key === PROJECTOR_THEME_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", onStorageChange);
  return () => {
    PROJECTOR_THEME_LISTENERS.delete(listener);
    window.removeEventListener("storage", onStorageChange);
  };
}

function setStoredProjectorTheme(theme: ProjectorTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTOR_THEME_STORAGE_KEY, theme);
  PROJECTOR_THEME_LISTENERS.forEach((listener) => listener());
}

const PROJECTOR_THEME_STYLES = {
  dark: {
    canvas: "bg-slate-950 text-white",
    leftGlow: "bg-rose-600/20",
    rightGlow: "bg-indigo-600/20",
    border: "border-white/10",
    muted: "text-white/45",
    secondary: "text-white/50",
    subtle: "text-white/55",
    faint: "text-white/40",
    control: "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10",
    panel: "border-white/10 bg-white/[0.06]",
    dashed: "border-white/15 text-white/45",
    item: "border-white/10 bg-white/5",
    stat: "bg-black/20",
    separator: "border-white/10",
    tag: "bg-white/10 text-white/80",
    tagName: "text-white/50",
    error: "text-rose-200",
    errorBox: "border-white/25 bg-slate-950/25 text-white",
  },
  light: {
    canvas: "bg-slate-50 text-slate-900",
    leftGlow: "bg-rose-300/25",
    rightGlow: "bg-sky-300/25",
    border: "border-slate-200",
    muted: "text-slate-500",
    secondary: "text-slate-500",
    subtle: "text-slate-600",
    faint: "text-slate-500",
    control: "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    panel: "border-slate-200 bg-white shadow-lg shadow-slate-900/5",
    dashed: "border-slate-300 text-slate-500",
    item: "border-slate-200 bg-slate-50",
    stat: "bg-slate-100",
    separator: "border-slate-200",
    tag: "bg-slate-100 text-slate-700",
    tagName: "text-slate-500",
    error: "text-rose-600",
    errorBox: "border-rose-200 bg-rose-50 text-rose-800",
  },
} as const;

interface Participant {
  id: string;
  role: PlayRoleId;
  groupId: string;
  student: { name: string };
}

interface ProjectorSnapshot {
  id: string;
  roomCode: string;
  status: SessionStatus;
  classroom: { id: string; name: string };
  participantCount: number;
  participants: Participant[];
  groups: Array<{
    id: string;
    name: string;
    participants: Participant[];
    work: {
      patientCards: number;
      nurseInterviews: number;
      labResults: number;
      doctorDiagnoses: number;
      pharmacyDispenses: number;
    };
    results: GroupResults | null;
  }>;
}

const FLOW = [
  { label: "ห้องบัตร", Icon: IdCard, key: "patientCards" as const, tone: "text-amber-300" },
  { label: "พยาบาล", Icon: HeartPulse, key: "nurseInterviews" as const, tone: "text-emerald-300" },
  { label: "แล็บ", Icon: FlaskConical, key: "labResults" as const, tone: "text-indigo-300" },
  { label: "แพทย์", Icon: Stethoscope, key: "doctorDiagnoses" as const, tone: "text-sky-300" },
  { label: "ยา", Icon: Pill, key: "pharmacyDispenses" as const, tone: "text-fuchsia-300" },
];

function RoleAvatar({ role, size = "md" }: { role: PlayRole | undefined; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const Icon = role?.icon;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-inner shadow-black/10 ${role?.gradient ?? "from-slate-400 to-slate-500"} ${sizeClass}`}
    >
      {Icon && <Icon className={iconClass} />}
    </span>
  );
}

export function ProjectorBoard({ roomCode }: { roomCode: string }) {
  const [snapshot, setSnapshot] = useState<ProjectorSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canControl, setCanControl] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const theme = useSyncExternalStore(
    subscribeToProjectorTheme,
    getStoredProjectorTheme,
    () => "dark" as ProjectorTheme,
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/play/sessions/room/${encodeURIComponent(roomCode)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ไม่สามารถโหลดจอโปรเจกเตอร์ได้");
      setSnapshot(result.data as ProjectorSnapshot);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดจอโปรเจกเตอร์ได้");
    }
  }, [roomCode]);

  const shouldPoll = snapshot?.status !== "ENDED";

  useEffect(() => {
    if (!shouldPoll) return;

    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [refresh, shouldPoll]);

  useEffect(() => {
    const verifyTeacher = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = await response.json();
        setCanControl(response.ok && result.success);
      } catch {
        setCanControl(false);
      }
    };

    const initialTimer = window.setTimeout(() => void verifyTeacher(), 0);
    return () => window.clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    startMusic();

    const onUserInteraction = () => {
      startMusic();
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };

    window.addEventListener("pointerdown", onUserInteraction, { once: true });
    window.addEventListener("keydown", onUserInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
      stopMusic("wizard");
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    setFullscreenError(null);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (!document.documentElement.requestFullscreen) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ");
      }

      await document.documentElement.requestFullscreen();
    } catch (fullscreenToggleError) {
      setFullscreenError(
        fullscreenToggleError instanceof Error
          ? fullscreenToggleError.message
          : "ไม่สามารถเปิดโหมดเต็มจอได้",
      );
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setStoredProjectorTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  async function handleStartGame() {
    if (!snapshot || starting) return;

    try {
      setStarting(true);
      setControlError(null);
      const response = await fetch(`/api/admin/simulations/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถเริ่มเกมได้");
      }
      setSnapshot(result.data as ProjectorSnapshot);
      setError(null);
    } catch (startError) {
      setControlError(startError instanceof Error ? startError.message : "ไม่สามารถเริ่มเกมได้");
    } finally {
      setStarting(false);
    }
  }

  async function handleEndGame() {
    if (!snapshot || ending) return;

    try {
      setEnding(true);
      setControlError(null);
      const response = await fetch(`/api/admin/simulations/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "END" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถสิ้นสุดเกมได้");
      }
      setSnapshot(result.data as ProjectorSnapshot);
      setError(null);
    } catch (endError) {
      setControlError(endError instanceof Error ? endError.message : "ไม่สามารถสิ้นสุดเกมได้");
    } finally {
      setEnding(false);
    }
  }

  const themeStyles = PROJECTOR_THEME_STYLES[theme];
  const isDarkTheme = theme === "dark";

  if (error && !snapshot) {
    return <main data-theme={theme} className={`flex min-h-screen items-center justify-center p-8 text-center ${themeStyles.canvas}`}><p className={`rounded-2xl border border-rose-400/30 bg-rose-500/10 px-6 py-5 text-lg font-bold ${themeStyles.error}`}>{error}</p></main>;
  }

  if (!snapshot) {
    return <main data-theme={theme} className={`flex min-h-screen items-center justify-center text-lg font-bold ${themeStyles.canvas} ${themeStyles.secondary}`}>กำลังเชื่อมต่อจอโปรเจกเตอร์...</main>;
  }

  const isLobby = snapshot.status === "LOBBY";
  const isEnded = snapshot.status === "ENDED";
  const recentParticipants = [...snapshot.participants].reverse();

  const overallResults = isEnded
    ? snapshot.groups.reduce(
        (totals, group) => {
          if (!group.results) return totals;
          totals.correct += group.results.correctCount;
          totals.wrong += group.results.wrongCount;
          totals.score += group.results.totalScore;
          return totals;
        },
        { correct: 0, wrong: 0, score: 0 },
      )
    : null;

  const leaderboardBars = isEnded
    ? snapshot.groups
        .map((group, groupIndex) => ({
          id: group.id,
          name: group.name,
          score: group.results?.totalScore ?? 0,
          successRate: group.results?.successRate ?? 0,
          correctCount: group.results?.correctCount ?? 0,
          wrongCount: group.results?.wrongCount ?? 0,
          doctorScore: group.results?.doctorScore ?? 0,
          labCorrectCount: group.results?.labCorrectCount ?? 0,
          labWrongCount: group.results?.labWrongCount ?? 0,
          labScore: group.results?.labScore ?? 0,
          accentBadge: GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length].badge,
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <main data-theme={theme} className={`min-h-screen overflow-hidden px-6 py-7 transition-colors duration-300 lg:px-10 lg:py-9 ${themeStyles.canvas}`}>
      <div className={`pointer-events-none fixed -left-36 -top-36 h-96 w-96 rounded-full blur-3xl ${themeStyles.leftGlow}`} />
      <div className={`pointer-events-none fixed -bottom-40 -right-32 h-112 w-112 rounded-full blur-3xl ${themeStyles.rightGlow}`} />
      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col">
        <header className={`flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between ${themeStyles.border}`}>
          <div>
            <p className={`text-sm font-bold uppercase tracking-[0.2em] ${themeStyles.muted}`}>SIM CR CLASSROOM · ห้องเรียนครูหน่อย</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{snapshot.classroom.name}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SoundToggle className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border px-3 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-[0.98] ${themeStyles.control}`} />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
              aria-pressed={isDarkTheme}
              title={isDarkTheme ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
              className={`inline-flex min-h-12 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-[0.98] ${themeStyles.control}`}
            >
              {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDarkTheme ? "สว่าง" : "มืด"}</span>
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? "ออกจากโหมดเต็มจอ" : "เปิดโหมดเต็มจอ"}
              aria-pressed={isFullscreen}
              title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "เปิดโหมดเต็มจอ"}
              className={`inline-flex min-h-12 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-[0.98] ${themeStyles.control}`}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}</span>
            </button>
            <div className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${themeStyles.control}`}>
              <DoorOpen className="h-5 w-5 text-amber-300" />
              <div><p className={`text-xs font-bold ${themeStyles.secondary}`}>ห้องจำลอง</p><p className="font-mono text-xl font-black tracking-[0.16em]">{snapshot.roomCode}</p></div>
            </div>
          </div>
        </header>
        {fullscreenError && <p role="alert" className={`mt-3 text-right text-xs font-semibold ${themeStyles.error}`}>{fullscreenError}</p>}

        {isLobby ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <div className="grid items-start gap-8 xl:grid-cols-[0.62fr_1.38fr]">
              <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-rose-600 via-red-600 to-orange-500 p-6 text-white shadow-2xl shadow-red-950/35 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">นักเรียนกรอกเลขห้องนี้</p>
                <p className="mt-2 font-mono text-4xl font-black tracking-[0.16em] sm:text-5xl">{snapshot.roomCode}</p>
                <div className="mt-4 flex items-center gap-2.5 text-sm font-bold"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200 opacity-80" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" /></span>กำลังรอครูเริ่มเกม</div>
                <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl bg-white/10 p-3 sm:flex-row sm:items-center">
                  <RoomQrCode roomCode={snapshot.roomCode} />
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-black">สแกน QR เพื่อเข้าห้อง</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">สแกนก่อน แล้วเลือกชื่อของตัวเอง</p>
                  </div>
                </div>
                {canControl && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void handleStartGame()}
                      disabled={starting}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-300 px-5 py-3.5 text-sm font-black text-emerald-950 shadow-xl shadow-emerald-950/20 transition hover:bg-emerald-200 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                    >
                      {starting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                      {starting ? "กำลังเริ่มเกม..." : "เริ่ม"}
                    </button>
                    {controlError && <p role="alert" className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${themeStyles.errorBox}`}>{controlError}</p>}
                  </div>
                )}
              </div>
              <div className={`rounded-[2rem] border p-7 backdrop-blur-sm sm:p-9 ${themeStyles.panel}`}>
                <div className="mb-6 flex items-end justify-between"><div><h2 className="text-3xl font-black">ผู้เข้าร่วมแล้ว</h2><p className={`mt-1 text-base ${themeStyles.subtle}`}>รายชื่อจะทยอยขึ้นบนจอนี้ทันทีที่เข้าร่วม · คนล่าสุดอยู่บนสุด</p></div><span className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-2xl font-black text-emerald-950">{snapshot.participantCount} คน</span></div>
                {snapshot.participantCount === 0 ? (
                  <div className={`flex min-h-48 items-center justify-center rounded-2xl border-2 border-dashed text-center ${themeStyles.dashed}`}>ยังไม่มีผู้เข้าร่วม<br />รอให้นักเรียนใส่เลขห้อง</div>
                ) : (
                  <>
                    <div className="flex max-h-[55vh] flex-wrap content-start gap-2 overflow-y-auto pr-1">
                      {recentParticipants.map((participant, index) => {
                        const role = getPlayRole(participant.role);
                        const group = snapshot.groups.find((item) => item.id === participant.groupId);
                        const isNewest = index === 0;
                        return (
                          <div
                            key={participant.id}
                            className={`animate-game-pop flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 ${isNewest ? "border-emerald-300 bg-emerald-400/15 ring-2 ring-emerald-300/60" : themeStyles.item}`}
                          >
                            <RoleAvatar role={role} size="sm" />
                            <span className="text-sm font-bold">{participant.student.name}</span>
                            <span className={`text-xs font-semibold ${themeStyles.subtle}`}>{group?.name ?? "ห้องตรวจไม่ระบุ"}</span>
                            {isNewest && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-emerald-950">ใหม่</span>}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGroups((prev) => !prev)}
                      aria-expanded={showGroups}
                      className={`mt-5 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${themeStyles.control}`}
                    >
                      {showGroups ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showGroups ? "ซ่อนรายชื่อแยกตามห้องตรวจ" : "ดูรายชื่อแยกตามห้องตรวจ"}
                    </button>
                    {showGroups && (
                      <div className="mt-4 grid max-h-[50vh] gap-5 overflow-y-auto pr-1 sm:grid-cols-2">
                        {snapshot.groups.map((group, groupIndex) => {
                          const accent = GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length];
                          return (
                            <div key={group.id} className={`rounded-2xl border p-5 ring-1 ${themeStyles.item} ${accent.ring}`}>
                              <div className="mb-4 flex items-center justify-between gap-2">
                                <h3 className="flex min-w-0 items-center gap-2 truncate text-base font-black uppercase tracking-wide">
                                  <DoorOpen className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                                  <span className="truncate">{group.name}</span>
                                </h3>
                                <span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-black ${accent.badge}`}>{group.participants.length} คน</span>
                              </div>
                              {group.participants.length === 0 ? (
                                <p className={`text-sm ${themeStyles.faint}`}>ยังไม่มีคนประจำห้องตรวจ</p>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  {group.participants.map((participant) => {
                                    const role = getPlayRole(participant.role);
                                    return (
                                      <div key={participant.id} className="flex items-center gap-3">
                                        <RoleAvatar role={role} size="lg" />
                                        <span className="min-w-0">
                                          <span className="block truncate text-base font-bold">{participant.student.name}</span>
                                          <span className={`block truncate text-sm ${themeStyles.subtle}`}>{role?.label ?? participant.role}</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-1 py-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black"><DoorOpen className="h-6 w-6 text-amber-300" aria-hidden="true" />{isEnded ? "สรุปรอบจำลอง" : "การทำงานของแต่ละห้องตรวจ"}</h2>
                <p className={`mt-1 text-sm ${themeStyles.subtle}`}>{isEnded ? "รอบฝึกสิ้นสุดแล้ว" : "อัปเดตสดจากสถานีของนักเรียน"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canControl && !isEnded && (
                  <button
                    type="button"
                    onClick={() => void handleEndGame()}
                    disabled={ending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-950/20 transition hover:bg-rose-400 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                  >
                    {ending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
                    {ending ? "กำลังสิ้นสุดเกม..." : "สิ้นสุดเกม"}
                  </button>
                )}
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${isEnded ? "bg-slate-700 text-slate-200" : "bg-emerald-400 text-emerald-950"}`}>{isEnded ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-950" />}{isEnded ? "สิ้นสุดเกม" : "เกมกำลังดำเนินอยู่"}</div>
              </div>
            </div>
            {controlError && <p role="alert" className={`mb-4 rounded-xl border px-3 py-2 text-sm font-medium ${themeStyles.errorBox}`}>{controlError}</p>}

            {isEnded && overallResults && (
              <div className={`mb-6 grid gap-5 rounded-3xl border p-5 backdrop-blur-sm md:grid-cols-[auto_1fr] ${themeStyles.panel}`}>
                <div>
                  <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${themeStyles.secondary}`}>ภาพรวมทั้งหมด</p>
                  <OverallResultsDonut correct={overallResults.correct} wrong={overallResults.wrong} themeStyles={themeStyles} />
                  <p className="mt-3 text-2xl font-black">
                    {overallResults.score} <span className={`text-sm font-bold ${themeStyles.secondary}`}>คะแนนรวมทุกกลุ่ม</span>
                  </p>
                </div>
                <div className={`border-t pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0 ${themeStyles.separator}`}>
                  <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${themeStyles.secondary}`}>เปรียบเทียบคะแนนรายกลุ่ม</p>
                  <GroupScoreLeaderboard bars={leaderboardBars} themeStyles={themeStyles} />
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {snapshot.groups.map((group, groupIndex) => {
                const accent = GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length];
                return (
                  <article key={group.id} className={`rounded-3xl border p-5 backdrop-blur-sm ${themeStyles.panel} ${isEnded ? `ring-1 ${accent.ring}` : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-xl font-black"><DoorOpen className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />{group.name}</h3>
                        <p className={`mt-1 text-sm ${themeStyles.secondary}`}>{group.participants.length} คนประจำห้องตรวจ</p>
                      </div>
                      <span className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-emerald-950">{group.work.pharmacyDispenses} เคสเสร็จ</span>
                    </div>

                    {isEnded && group.results ? (
                      <GroupResultsSummaryCard results={group.results} themeStyles={themeStyles} />
                    ) : (
                      <div className="mt-5 grid grid-cols-5 gap-2">{FLOW.map(({ label, Icon, key, tone }) => <div key={key} className={`rounded-2xl px-2 py-3 text-center ${themeStyles.stat}`}><Icon className={`mx-auto h-4 w-4 ${tone}`} /><p className="mt-1 text-xl font-black">{group.work[key]}</p><p className={`mt-0.5 text-[10px] font-bold ${themeStyles.secondary}`}>{label}</p></div>)}</div>
                    )}

                    <div className={`mt-4 flex flex-wrap gap-2 border-t pt-4 ${themeStyles.separator}`}>
                      {group.participants.length === 0 ? (
                        <p className={`text-xs ${themeStyles.faint}`}>ยังไม่มีคนประจำห้องตรวจ</p>
                      ) : isEnded ? (
                        group.participants.map((participant) => (
                          <span key={participant.id} className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold ${themeStyles.tag}`}>
                            {participant.student.name}
                          </span>
                        ))
                      ) : (
                        group.participants.map((participant) => {
                          const role = getPlayRole(participant.role);
                          return (
                            <span key={participant.id} className={`inline-flex items-center gap-1.5 rounded-lg py-1.5 pl-1.5 pr-2.5 text-xs font-semibold ${themeStyles.tag}`}>
                              <RoleAvatar role={role} size="sm" />
                              {role?.label ?? participant.role}
                              <span className={`max-w-32 truncate ${themeStyles.tagName}`}>{participant.student.name}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
