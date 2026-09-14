"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, subscribeToSoundChanges, toggleMuted } from "@/lib/play/sound";

export function SoundToggle({ className }: { className?: string }) {
  const muted = useSyncExternalStore(
    subscribeToSoundChanges,
    isMuted,
    () => false
  );

  return (
    <button
      type="button"
      onClick={() => toggleMuted()}
      aria-label={muted ? "เปิดเสียงดนตรีและเอฟเฟกต์" : "ปิดเสียงดนตรีและเอฟเฟกต์"}
      title={muted ? "เปิดเสียงดนตรีและเอฟเฟกต์" : "ปิดเสียงดนตรีและเอฟเฟกต์"}
      className={
        className ??
        `group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
          muted
            ? "border-slate-200/90 bg-white/80 text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-700 shadow-xs"
            : "border-red-200/80 bg-red-50/70 text-red-600 shadow-xs hover:border-red-300 hover:bg-red-50"
        }`
      }
    >
      {muted ? (
        <VolumeX className="h-4 w-4 transition-transform group-hover:scale-110" />
      ) : (
        <Volume2 className="h-4 w-4 transition-transform group-hover:scale-110" />
      )}
    </button>
  );
}
