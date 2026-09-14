"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, DoorOpen, RefreshCw, Users } from "lucide-react";
import { getPlayRole, type PlayRoleId } from "@/lib/play/roles";

interface LobbyParticipant {
  role: PlayRoleId;
  student: { id: string; name: string };
  group: { id: string; name: string };
  simulation: {
    id: string;
    roomCode: string;
    status: "LOBBY" | "RUNNING" | "ENDED";
    classroom: { id: string; name: string };
  };
}

export function PlayLobby({
  simulationId,
  studentId,
}: {
  simulationId: string;
  studentId: string;
}) {
  const router = useRouter();
  const [participant, setParticipant] = useState<LobbyParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    if (!simulationId || !studentId) {
      setError("ลิงก์เข้าร่วมห้องจำลองไม่สมบูรณ์");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/play/sessions/${simulationId}/state?studentId=${encodeURIComponent(studentId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถตรวจสอบสถานะห้องจำลองได้");
      }

      const data = result.data as LobbyParticipant;
      setParticipant(data);
      setError(null);
      if (data.simulation.status === "RUNNING") {
        router.replace(`/play/${data.role}?session=${simulationId}&student=${studentId}`);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถตรวจสอบสถานะเกมได้");
    } finally {
      setLoading(false);
    }
  }, [router, simulationId, studentId]);

  const shouldPoll = !participant || participant.simulation.status === "LOBBY";

  useEffect(() => {
    if (!shouldPoll) return;

    const initialTimer = window.setTimeout(() => void refreshState(), 0);
    const interval = window.setInterval(() => void refreshState(), 5_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [refreshState, shouldPoll]);

  const role = participant ? getPlayRole(participant.role) : null;
  const ended = participant?.simulation.status === "ENDED";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 bg-game-dots-dark px-5 py-8 text-white">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 px-7 py-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            {ended ? <CheckCircle2 className="h-7 w-7" /> : <CircleDashed className="h-7 w-7 animate-spin" />}
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">SIM CR CLASSROOM · ห้องเรียนครูหน่อย</p>
          <h1 className="mt-1 text-2xl font-black">{ended ? "รอบจำลองสิ้นสุดแล้ว" : "เข้าห้องเรียบร้อยแล้ว"}</h1>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          {loading && !participant ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-slate-300"><RefreshCw className="h-4 w-4 animate-spin" /> กำลังตรวจสอบห้อง...</div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-100">{error}</p>
              <Link href="/play" className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100">กลับไปใส่เลขห้อง</Link>
            </div>
          ) : participant ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <DoorOpen className="mb-2 h-4 w-4 text-amber-300" />
                  <p className="text-xs font-medium text-slate-400">เลขห้อง</p>
                  <p className="mt-1 font-mono text-2xl font-black tracking-[0.14em]">{participant.simulation.roomCode}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Users className="mb-2 h-4 w-4 text-teal-300" />
                  <p className="text-xs font-medium text-slate-400">ห้องตรวจ / บทบาท</p>
                  <p className="mt-1 text-sm font-black text-white">{participant.group.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-teal-200">{role?.label ?? participant.role}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                <p className="font-bold text-emerald-100">{participant.student.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-200/80">
                  {ended
                    ? "ครูปิดรอบฝึกนี้แล้ว ขอบคุณที่เข้าร่วม"
                    : "ครูเห็นชื่อของน้องบนหน้าควบคุมแล้ว ระบบจะพาเข้าสถานีทันทีเมื่อครูกดเริ่มเกม"}
                </p>
              </div>

              {!ended && (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                  <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
                  กำลังรอครูเริ่มเกม
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
      <p className="text-xs font-medium text-white/30">
        Developed by{" "}
        <a
          href="https://me.mosapps.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-white/50 transition-colors hover:text-orange-300 hover:underline"
        >
          mosapps
        </a>
      </p>
    </main>
  );
}
