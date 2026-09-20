"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCopy,
  DoorOpen,
  ExternalLink,
  Gamepad2,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Square,
  Users,
} from "lucide-react";
import { getPlayRole, type PlayRoleId } from "@/lib/play/roles";
import type { GroupResults } from "@/components/projector/results-summary";
import { SimulationResultsSummary } from "@/components/admin/simulation-results-summary";

type SessionStatus = "LOBBY" | "RUNNING" | "ENDED";

interface ClassroomOption {
  id: string;
  name: string;
}

interface SessionListItem {
  id: string;
  roomCode: string;
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  classroom: { id: string; name: string };
  participantCount: number;
}

interface Participant {
  id: string;
  role: PlayRoleId;
  groupId: string;
  joinedAt: string;
  student: { id: string; name: string; studentId: string | null };
}

interface SessionSnapshot {
  id: string;
  roomCode: string;
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  classroom: { id: string; name: string; groups: Array<{ id: string; name: string }> };
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

function statusLabel(status: SessionStatus) {
  if (status === "LOBBY") return "รอเริ่ม";
  if (status === "RUNNING") return "กำลังเล่น";
  return "สิ้นสุดแล้ว";
}

function statusClass(status: SessionStatus) {
  if (status === "LOBBY") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "RUNNING") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-500";
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SimulationsContent() {
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const skipNextInitialSnapshotLoad = useRef<string | null>(null);

  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === selectedClassroomId),
    [classrooms, selectedClassroomId]
  );

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/simulations", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ไม่สามารถโหลดรอบจำลองได้");
      const data = result.data as { classrooms: ClassroomOption[]; sessions: SessionListItem[] };
      setClassrooms(data.classrooms);
      setSessions(data.sessions);
      setSelectedClassroomId((current) => current || data.classrooms[0]?.id || "");
      setSelectedSessionId((current) => current || data.sessions[0]?.id || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดรอบจำลองได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSnapshot = useCallback(async (simulationId: string, showError = true) => {
    if (!simulationId) {
      setSnapshot(null);
      return;
    }
    try {
      if (showError) setError(null);
      const response = await fetch(`/api/admin/simulations/${simulationId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ไม่สามารถโหลดข้อมูลหน้าห้องได้");
      setSnapshot(result.data as SessionSnapshot);
    } catch (fetchError) {
      if (showError) setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดข้อมูลหน้าห้องได้");
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadSessions(), 0);
    return () => window.clearTimeout(initialTimer);
  }, [loadSessions]);

  const selectedSessionEnded =
    snapshot?.id === selectedSessionId && snapshot.status === "ENDED";

  useEffect(() => {
    if (!selectedSessionId || selectedSessionEnded) {
      return;
    }

    const skipInitialLoad = skipNextInitialSnapshotLoad.current === selectedSessionId;
    if (skipInitialLoad) skipNextInitialSnapshotLoad.current = null;

    const initialTimer = skipInitialLoad
      ? undefined
      : window.setTimeout(() => void loadSnapshot(selectedSessionId), 0);
    const interval = window.setInterval(() => void loadSnapshot(selectedSessionId, false), 3500);
    return () => {
      if (initialTimer !== undefined) window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [loadSnapshot, selectedSessionEnded, selectedSessionId]);

  async function handleCreate() {
    if (!selectedClassroomId || creating) return;
    try {
      setCreating(true);
      setError(null);
      setNotice(null);
      const response = await fetch("/api/admin/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomId: selectedClassroomId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ไม่สามารถสร้างห้องจำลองได้");
      const created = result.data as SessionSnapshot;
      setSnapshot(created);
      skipNextInitialSnapshotLoad.current = created.id;
      setSelectedSessionId(created.id);
      setNotice(result.message || "สร้างห้องจำลองเรียบร้อยแล้ว");
      await loadSessions();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "ไม่สามารถสร้างห้องจำลองได้");
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(action: "START" | "END") {
    if (!snapshot || updating) return;
    try {
      setUpdating(true);
      setError(null);
      setNotice(null);
      const response = await fetch(`/api/admin/simulations/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ไม่สามารถอัปเดตสถานะได้");
      setSnapshot(result.data as SessionSnapshot);
      setNotice(result.message || "อัปเดตสถานะเรียบร้อยแล้ว");
      await loadSessions();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setUpdating(false);
    }
  }

  async function copyRoomCode() {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(snapshot.roomCode);
      setNotice("คัดลอกเลขห้องแล้ว");
    } catch {
      setNotice("เลขห้องคือ " + snapshot.roomCode);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
            <Gamepad2 className="h-3.5 w-3.5" /> LIVE SIMULATION
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ควบคุมห้องจำลอง</h1>
          <p className="mt-1 text-sm text-slate-500">สร้างเลขห้องสุ่ม รับนักเรียนเข้ารอบ และเริ่มเกมพร้อมกัน</p>
        </div>
        <button type="button" onClick={() => void loadSessions()} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
        </button>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      {notice && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">สร้างรอบจำลองใหม่</p>
            <p className="mt-1 text-xs text-slate-500">เลือกห้องเรียนเพียงครั้งเดียว นักเรียนจะใช้เลขห้องเข้าร่วม แล้วเลือกห้องตรวจและบทบาทด้วยตนเอง</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="sr-only" htmlFor="simulation-classroom">ห้องเรียน</label>
            <select id="simulation-classroom" value={selectedClassroomId} onChange={(event) => setSelectedClassroomId(event.target.value)} disabled={loading || creating} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10">
              {classrooms.length === 0 ? <option value="">ยังไม่มีห้องเรียนที่พร้อมใช้</option> : classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
            </select>
            <button type="button" onClick={handleCreate} disabled={!selectedClassroom || creating || loading} className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "กำลังสร้าง..." : "สร้างและสุ่มเลขห้อง"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">รอบล่าสุด</p>
          {loading ? <div className="flex justify-center py-10"><LoaderCircle className="h-5 w-5 animate-spin text-slate-400" /></div> : sessions.length === 0 ? <p className="px-1 py-6 text-sm text-slate-400">ยังไม่มีรอบจำลอง</p> : <div className="space-y-2">{sessions.map((session) => (
            <button key={session.id} type="button" onClick={() => { setSelectedSessionId(session.id); setNotice(null); }} className={`w-full rounded-2xl border p-3 text-left transition ${selectedSessionId === session.id ? "border-red-300 bg-red-50 ring-2 ring-red-100" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-black tracking-wider text-slate-900">{session.roomCode}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(session.status)}`}>{statusLabel(session.status)}</span></div>
              <p className="mt-1 truncate text-xs font-semibold text-slate-600">{session.classroom.name}</p>
              <p className="mt-1 text-[11px] text-slate-400"><Users className="mr-1 inline h-3 w-3" />{session.participantCount} คน · {formatTime(session.createdAt)}</p>
            </button>
          ))}</div>}
        </aside>

        <section className="min-w-0">
          {!snapshot ? (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center"><DoorOpen className="mb-3 h-10 w-10 text-slate-300" /><p className="font-bold text-slate-700">เลือกหรือสร้างห้องจำลองเพื่อเริ่มต้น</p><p className="mt-1 text-sm text-slate-400">เลขห้องจะถูกสุ่มให้โดยอัตโนมัติ</p></div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 px-5 py-6 text-white sm:px-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">ห้องจำลอง · {snapshot.classroom.name}</p>
                      <div className="mt-2 flex items-center gap-3"><p className="font-mono text-4xl font-black tracking-[0.18em] sm:text-5xl">{snapshot.roomCode}</p><button type="button" onClick={() => void copyRoomCode()} title="คัดลอกเลขห้อง" className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"><ClipboardCopy className="h-4 w-4" /></button></div>
                      <p className="mt-2 text-xs font-medium text-white/65">ให้นักเรียนกด “เริ่ม” แล้วใส่เลขนี้เพื่อเข้ารอบ</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/projector/${snapshot.roomCode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"><ExternalLink className="h-3.5 w-3.5" />เปิดจอโปรเจกเตอร์</Link>
                      {snapshot.status === "LOBBY" && <button type="button" disabled={updating} onClick={() => void handleAction("START")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-300 disabled:opacity-60"><Play className="h-3.5 w-3.5 fill-current" />{updating ? "กำลังเริ่ม..." : "เริ่มเกม"}</button>}
                      {snapshot.status === "RUNNING" && <button type="button" disabled={updating} onClick={() => void handleAction("END")} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-950/20 transition hover:bg-rose-400 disabled:opacity-60"><Square className="h-3.5 w-3.5 fill-current" />{updating ? "กำลังปิด..." : "สิ้นสุดเกม"}</button>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:grid-cols-3 sm:px-7"><div><p className="text-xs font-bold text-slate-400">สถานะ</p><span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(snapshot.status)}`}>{statusLabel(snapshot.status)}</span></div><div><p className="text-xs font-bold text-slate-400">ผู้เข้าร่วม</p><p className="mt-1 text-lg font-black text-slate-800">{snapshot.participantCount} <span className="text-xs font-semibold text-slate-400">คน</span></p></div><div><p className="text-xs font-bold text-slate-400">เวลาเริ่มเกม</p><p className="mt-1 text-sm font-bold text-slate-700">{formatTime(snapshot.startedAt)}</p></div></div>
              </div>

              {selectedSessionEnded && (
                <SimulationResultsSummary
                  groups={snapshot.groups}
                  subtitle={`รอบ ${snapshot.roomCode} · สิ้นสุดเมื่อ ${formatTime(snapshot.endedAt)}`}
                />
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">นักเรียนที่เข้าห้องแล้ว</h2><p className="mt-1 text-xs text-slate-500">รีเฟรชอัตโนมัติทุก 3.5 วินาที</p></div><Users className="h-5 w-5 text-teal-500" /></div>
                {snapshot.participants.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-9 text-center text-sm text-slate-400">กำลังรอนักเรียนใส่เลขห้องและเลือกบทบาท</div> : <div className="grid gap-2 sm:grid-cols-2">{snapshot.participants.map((participant) => { const role = getPlayRole(participant.role); return <div key={participant.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{participant.student.name}</span><span className="block truncate text-xs text-slate-500">{snapshot.groups.find((group) => group.id === participant.groupId)?.name ?? "ห้องตรวจไม่ระบุ"} · {role?.label ?? participant.role}</span></span><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /></div>; })}</div>}
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
