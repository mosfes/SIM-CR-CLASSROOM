"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RefreshCw, Users, X } from "lucide-react";
import { getPlayRole, PLAY_ROLES, type PlayRoleId } from "@/lib/play/roles";
import { playBack, playClick, playHover, playSelect, playSuccess } from "@/lib/play/sound";

interface GroupOption {
  id: string;
  name: string;
}

interface ChangeRoleModalProps {
  currentRoleId: PlayRoleId;
  studentId: string;
  simulationId: string;
  roomCode: string;
  currentGroupId: string;
  groups: GroupOption[];
}

export function ChangeRoleModal({
  currentRoleId,
  studentId,
  simulationId,
  roomCode,
  currentGroupId,
  groups,
}: ChangeRoleModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<PlayRoleId>(currentRoleId);
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroupId);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    playClick();
    setSelectedRoleId(currentRoleId);
    setSelectedGroupId(currentGroupId);
    setError(null);
    setIsOpen(true);
  }

  function closeModal() {
    if (isSwitching) return;
    playBack();
    setIsOpen(false);
  }

  async function handleConfirm() {
    if (!selectedGroupId || isSwitching) return;

    try {
      setIsSwitching(true);
      setError(null);
      const response = await fetch(`/api/play/sessions/${simulationId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          groupId: selectedGroupId,
          role: selectedRoleId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถเปลี่ยนบทบาทได้");
      }

      playSuccess();
      router.replace(`/play/${selectedRoleId}?session=${simulationId}&student=${studentId}`);
      setIsOpen(false);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "ไม่สามารถเปลี่ยนบทบาทได้");
      setIsSwitching(false);
    }
  }

  const selectedRole = getPlayRole(selectedRoleId);
  const isSameAsCurrent = selectedRoleId === currentRoleId && selectedGroupId === currentGroupId;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        onMouseEnter={playHover}
        className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600 active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5 text-red-500" />
        <span>เปลี่ยนบทบาท</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-game-pop" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">เปลี่ยนบทบาทระหว่างเกม</h3>
                <p className="mt-1 text-xs text-slate-500">ห้องจำลอง {roomCode} · เลือกกลุ่มและสถานีใหม่ได้ทันที</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isSwitching} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto py-4">
              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">1. เลือกบทบาทใหม่</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLAY_ROLES.map((role) => {
                    const Icon = role.icon;
                    const isPicked = selectedRoleId === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          playSelect();
                          setSelectedRoleId(role.id);
                        }}
                        onMouseEnter={playHover}
                        className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                          isPicked ? "border-red-500 bg-red-50/50 ring-2 ring-red-200 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient} text-white shadow-sm`}><Icon className="h-4 w-4" /></span>
                          {currentRoleId === role.id && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">ปัจจุบัน</span>}
                        </div>
                        <p className="text-sm font-bold text-slate-900">{role.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{role.description}</p>
                        {isPicked && <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-red-600"><Check className="h-3 w-3" />เลือกแล้ว</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">2. เลือกกลุ่ม</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {groups.map((group) => {
                    const isPicked = selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          playClick();
                          setSelectedGroupId(group.id);
                        }}
                        onMouseEnter={playHover}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                          isPicked ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <Users className={`h-3.5 w-3.5 shrink-0 ${isPicked ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="truncate">{group.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={closeModal} disabled={isSwitching} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50">ยกเลิก</button>
                <button type="button" onClick={handleConfirm} disabled={isSwitching || !selectedRole || !selectedGroupId} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition hover:bg-red-700 active:scale-95 disabled:opacity-50">
                  <span>{isSwitching ? "กำลังเปลี่ยนบทบาท..." : isSameAsCurrent ? "คงบทบาทเดิม" : "ยืนยันการเปลี่ยนบทบาท"}</span>
                  {!isSwitching && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
