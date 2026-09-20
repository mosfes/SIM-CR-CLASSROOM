"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RefreshCw, Users, X } from "lucide-react";
import { getPlayRole, PLAY_ROLES, type PlayRoleId } from "@/lib/play/roles";
import { playBack, playClick, playHover, playSelect, playSuccess } from "@/lib/play/sound";
import { ROLE_THEME } from "@/components/play/kit/theme";

const emptySubscribe = () => () => {};

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
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
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

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSwitching) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSwitching]);

  const isSameAsCurrent = selectedRoleId === currentRoleId && selectedGroupId === currentGroupId;

  async function handleConfirm() {
    if (!selectedGroupId || isSwitching) return;

    if (isSameAsCurrent) {
      closeModal();
      return;
    }

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
      router.refresh();
      setIsOpen(false);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "ไม่สามารถเปลี่ยนบทบาทได้");
    } finally {
      setIsSwitching(false);
    }
  }

  const selectedRole = getPlayRole(selectedRoleId);

  const modalOverlay =
    isOpen && isClient
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-role-title"
              className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-game-pop"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
                <div>
                  <h3 id="change-role-title" className="text-lg font-black text-slate-900">
                    เปลี่ยนบทบาทระหว่างเกม
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    ห้องจำลอง {roomCode} · เลือกสถานีและห้องตรวจใหม่ได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSwitching}
                  aria-label="ปิดหน้าต่าง"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <div>
                  <p className="mb-2.5 text-xs font-black text-slate-500">1. เลือกบทบาทใหม่</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PLAY_ROLES.map((role) => {
                      const Icon = role.icon;
                      const theme = ROLE_THEME[role.id];
                      const isPicked = selectedRoleId === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          aria-pressed={isPicked}
                          onClick={() => {
                            playSelect();
                            setSelectedRoleId(role.id);
                          }}
                          onMouseEnter={playHover}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                            isPicked ? theme.chosen : theme.choice
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.solid}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                              {role.label}
                              {currentRoleId === role.id && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                  ปัจจุบัน
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-[11px] font-medium leading-snug text-slate-500">
                              {role.description}
                            </span>
                          </span>
                          {isPicked && <Check className={`h-5 w-5 shrink-0 ${theme.text}`} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2.5 text-xs font-black text-slate-500">2. เลือกห้องตรวจ</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {groups.map((group) => {
                      const isPicked = selectedGroupId === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          aria-pressed={isPicked}
                          onClick={() => {
                            playClick();
                            setSelectedGroupId(group.id);
                          }}
                          onMouseEnter={playHover}
                          className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                            isPicked
                              ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
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

              <div className="shrink-0 border-t border-slate-100 px-5 pb-5 pt-4">
                {error && (
                  <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                    {error}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSwitching}
                    className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isSwitching || !selectedRole || !selectedGroupId}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-md shadow-red-500/25 transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
                  >
                    <span>
                      {isSwitching ? "กำลังเปลี่ยนบทบาท..." : isSameAsCurrent ? "คงบทบาทเดิม" : "ยืนยันการเปลี่ยนบทบาท"}
                    </span>
                    {!isSwitching && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        onMouseEnter={playHover}
        aria-label="เปลี่ยนบทบาท"
        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-xs transition hover:border-red-300 hover:text-red-600 active:scale-95"
      >
        <RefreshCw className="h-4 w-4 text-red-500" />
        <span className="hidden sm:inline">เปลี่ยนบทบาท</span>
      </button>

      {modalOverlay}
    </>
  );
}
