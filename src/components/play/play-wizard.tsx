"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DoorOpen,
  Home,
  Search,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { SoundToggle } from "@/components/play/sound-toggle";
import { PLAY_ROLES, type PlayRoleId } from "@/lib/play/roles";
import {
  playBack,
  playHover,
  playSelect,
  playSuccess,
  startMenuMusic,
  stopMusic,
} from "@/lib/play/sound";

interface StudentOption {
  id: string;
  studentId: string | null;
  name: string;
}

interface GroupOption {
  id: string;
  name: string;
}

interface SimulationSession {
  id: string;
  roomCode: string;
  status: "LOBBY" | "RUNNING" | "ENDED";
  classroom: {
    id: string;
    name: string;
    groups: GroupOption[];
  };
  students: StudentOption[];
}

type Step = "room" | "student" | "assignment";
const MAX_VISIBLE_STUDENTS = 60;

function getThaiPrimaryConsonant(name: string) {
  const withoutPrefix = name
    .trim()
    .replace(/^(นางสาว|น\.ส\.|เด็กหญิง|ด\.ญ\.|นาย|เด็กชาย|ด\.ช\.|นาง)\s*/, "")
    .replace(/^[เแโใไ]/, "");
  return withoutPrefix[0] ?? name[0] ?? "?";
}

export function PlayWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("room");
  const [roomCode, setRoomCode] = useState("");
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [groupId, setGroupId] = useState("");
  const [roleId, setRoleId] = useState<PlayRoleId | null>(null);
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startMenuMusic();
  }, []);

  const filteredStudents = useMemo(() => {
    const students = session?.students ?? [];
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(query) ||
        (candidate.studentId ?? "").toLowerCase().includes(query)
    );
  }, [session, studentQuery]);

  const visibleStudents = filteredStudents.slice(0, MAX_VISIBLE_STUDENTS);
  const selectedGroup = session?.classroom.groups.find((group) => group.id === groupId) ?? null;
  const selectedRole = PLAY_ROLES.find((role) => role.id === roleId) ?? null;

  const steps = [
    { id: "room" as const, number: 1, label: "ใส่เลขห้อง" },
    { id: "student" as const, number: 2, label: "เลือกชื่อ" },
    { id: "assignment" as const, number: 3, label: "เลือกห้องตรวจและบทบาท" },
  ];

  function goBack() {
    playBack();
    setError(null);
    if (step === "assignment") {
      setRoleId(null);
      setGroupId("");
      setStep("student");
    } else if (step === "student") {
      setStudent(null);
      setStudentQuery("");
      setStep("room");
    }
  }

  const lookupRoom = useCallback(async (rawRoomCode: string) => {
    const cleanCode = rawRoomCode.replace(/\D/g, "").slice(0, 6);
    setRoomCode(cleanCode);
    if (cleanCode.length !== 6) {
      setError("กรุณากรอกเลขห้อง 6 หลักที่ครูแสดงบนจอ");
      return;
    }

    try {
      setCheckingRoom(true);
      setError(null);
      const response = await fetch(
        `/api/play/sessions/lookup?roomCode=${encodeURIComponent(cleanCode)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่พบห้องจำลองนี้");
      }

      const foundSession = result.data as SimulationSession;
      if (foundSession.status === "ENDED") {
        throw new Error("รอบจำลองนี้สิ้นสุดแล้ว กรุณารอเลขห้องใหม่จากครู");
      }
      if (foundSession.classroom.groups.length === 0) {
        throw new Error("ห้องจำลองนี้ยังไม่มีห้องตรวจให้เลือก กรุณาแจ้งครู");
      }

      playSuccess();
      setSession(foundSession);
      setGroupId("");
      setStep("student");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "ไม่สามารถตรวจสอบเลขห้องได้");
    } finally {
      setCheckingRoom(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedRoomCode = params.get("roomCode");
    if (!scannedRoomCode || params.get("entry") !== "qr") return;

    const timer = window.setTimeout(() => void lookupRoom(scannedRoomCode), 0);
    return () => window.clearTimeout(timer);
  }, [lookupRoom]);

  function handleLookupRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookupRoom(roomCode);
  }

  function handleSelectStudent(candidate: StudentOption) {
    playSelect();
    setStudent(candidate);
    setError(null);
    setStep("assignment");
  }

  async function handleJoin() {
    if (!session || !student || !selectedGroup || !selectedRole || joining) return;

    try {
      setJoining(true);
      setError(null);
      const response = await fetch(`/api/play/sessions/${session.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          groupId: selectedGroup.id,
          role: selectedRole.id,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถเข้าร่วมห้องจำลองได้");
      }

      playSuccess();
      stopMusic("menu");
      router.push(`/play/lobby?session=${session.id}&student=${student.id}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "ไม่สามารถเข้าร่วมห้องจำลองได้");
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-2xs backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            title="กลับสู่หน้าหลัก"
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <Home className="h-4 w-4" />
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-2 text-white shadow-xs">
            <LogoMark className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-none text-slate-900 sm:text-lg">
              SIM CR <span className="text-red-600">Classroom</span>
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-400">เข้าสู่ห้องจำลองที่ครูเปิดไว้</p>
          </div>
        </div>
        <SoundToggle />
      </header>

      <nav aria-label="ขั้นตอนการเข้าร่วมห้องจำลอง" className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {steps.map((item, index) => {
          const currentIndex = steps.findIndex((stepItem) => stepItem.id === step);
          const active = item.id === step;
          const done = index < currentIndex;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!done}
              onClick={() => {
                if (!done) return;
                playBack();
                setError(null);
                setStep(item.id);
              }}
              className={`flex min-w-0 items-center gap-2 rounded-2xl border p-2.5 text-left transition sm:p-3.5 ${
                active
                  ? "border-rose-400 bg-white shadow-xs"
                  : done
                    ? "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                active ? "bg-rose-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {done ? <Check className="h-4 w-4" /> : item.number}
              </span>
              <span className="min-w-0 text-xs font-bold leading-tight sm:text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {session && step !== "room" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">ห้องจำลอง {session.roomCode}</p>
              <p className="text-sm font-bold text-slate-800">{session.classroom.name}</p>
            </div>
          </div>
          {student && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <UserRound className="h-4 w-4 text-teal-600" />
              <span>{student.name}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1">
        {step === "room" && (
          <section className="mx-auto max-w-xl animate-game-pop rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/25">
                <DoorOpen className="h-8 w-8" />
              </div>
              <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">ขั้นตอนที่ 1 จาก 3</span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ใส่เลขห้องจำลอง</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">ดูเลข 6 หลักบนจอของคุณครู แล้วพิมพ์เพื่อเข้าห้องที่ถูกต้อง</p>
            </div>

            <form onSubmit={handleLookupRoom} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">เลขห้อง 6 หลัก</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={roomCode}
                  onChange={(event) => {
                    setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  placeholder="เช่น 482913"
                  maxLength={6}
                  className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-center font-mono text-3xl font-black tracking-[0.28em] text-slate-900 outline-none transition placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-300 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </label>
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">{error}</p>}
              <button
                type="submit"
                disabled={checkingRoom}
                onMouseEnter={playHover}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                <span>{checkingRoom ? "กำลังตรวจสอบห้อง..." : "เข้าสู่ห้องจำลอง"}</span>
                {!checkingRoom && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </section>
        )}

        {step === "student" && (
          <section className="animate-game-pop">
            <div className="mb-5">
              <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">ขั้นตอนที่ 2 จาก 3</span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">เลือกชื่อตัวเอง</h1>
              <p className="mt-1 text-sm text-slate-500">เลือกชื่อของตัวเองเพื่อไปเลือกห้องตรวจและบทบาท</p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
              <input
                autoFocus
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                placeholder="พิมพ์ชื่อ นามสกุล หรือรหัสนักศึกษา..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-28 text-sm font-medium text-slate-800 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {studentQuery && (
                  <button type="button" onClick={() => setStudentQuery("")} className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{filteredStudents.length} คน</span>
              </div>
            </div>

            <div className="max-h-[min(68vh,640px)] overflow-y-auto rounded-3xl pr-1">
              {visibleStudents.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                  <UserRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-bold text-slate-700">ไม่พบรายชื่อที่ค้นหา</p>
                  <p className="mt-1 text-xs text-slate-400">ลองตรวจสอบชื่อ นามสกุล หรือรหัสนักศึกษาอีกครั้ง</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleStudents.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectStudent(candidate)}
                      onMouseEnter={playHover}
                      aria-pressed={student?.id === candidate.id}
                      className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${student?.id === candidate.id ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white hover:border-teal-300"}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-black text-white shadow-sm">
                        {student?.id === candidate.id ? <Check className="h-5 w-5" /> : getThaiPrimaryConsonant(candidate.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">{candidate.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-slate-400">{candidate.studentId ? `#${candidate.studentId}` : "ไม่มีรหัส"}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filteredStudents.length > MAX_VISIBLE_STUDENTS && <p className="mt-3 text-center text-xs text-slate-400">แสดง {MAX_VISIBLE_STUDENTS} รายการแรก — พิมพ์เพิ่มเพื่อค้นหาให้เจาะจง</p>}
            <button type="button" onClick={goBack} className="mt-6 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> เปลี่ยนเลขห้อง
            </button>
          </section>
        )}

        {step === "assignment" && session && student && (
          <section className="animate-game-pop">
            <div className="mb-6">
              <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">ขั้นตอนที่ 3 จาก 3</span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">เลือกห้องตรวจและบทบาท</h1>
              <p className="mt-1 text-sm text-slate-500">
                {session.status === "RUNNING"
                  ? "เกมกำลังดำเนินอยู่ เลือกห้องตรวจและบทบาทเพื่อเข้าเกมได้ทันที"
                  : "ครูจะเห็นชื่อของน้องทันที และจะเริ่มเกมเมื่อทุกคนพร้อม"}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-bold">เลือกห้องตรวจ</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {session.classroom.groups.map((group) => {
                    const picked = group.id === groupId;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          playSelect();
                          setGroupId(group.id);
                        }}
                        onMouseEnter={playHover}
                        className={`flex items-center justify-between rounded-2xl border p-3 text-left text-sm font-bold transition ${
                          picked ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100" : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{group.name}</span>
                        {picked && <Check className="h-4 w-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <UserRound className="h-5 w-5 text-rose-500" />
                  <h2 className="font-bold">เลือกบทบาท</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLAY_ROLES.map((role) => {
                    const Icon = role.icon;
                    const picked = role.id === roleId;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          playSelect();
                          setRoleId(role.id);
                        }}
                        onMouseEnter={playHover}
                        className={`rounded-2xl border p-3.5 text-left transition ${
                          picked ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient} text-white shadow-sm`}><Icon className="h-4 w-4" /></span>
                          {picked && <Check className="h-4 w-4 text-rose-600" />}
                        </div>
                        <p className="text-sm font-bold text-slate-900">{role.label}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{role.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={goBack} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
                <ArrowLeft className="h-3.5 w-3.5" /> เปลี่ยนตัวตน
              </button>
              <button
                type="button"
                disabled={!selectedGroup || !selectedRole || joining}
                onClick={handleJoin}
                onMouseEnter={playHover}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>
                  {joining
                    ? "กำลังเข้าห้อง..."
                    : session.status === "RUNNING"
                      ? "ยืนยันและเข้าเกม"
                      : "ยืนยันและรอครูเริ่มเกม"}
                </span>
                {!joining && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
