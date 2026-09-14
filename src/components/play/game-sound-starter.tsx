"use client";

import { useEffect } from "react";
import { startMusic, stopMusic } from "@/lib/play/sound";
import { SoundToggle } from "@/components/play/sound-toggle";

export function GameSoundStarter() {
  useEffect(() => {
    // Switch to in-game simulation soundtrack when entering the role station
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
      // Scoped to our own track: if the wizard has already mounted and started
      // the menu theme, unmounting here must not silence it.
      stopMusic("wizard");
    };
  }, []);

  return (
    <SoundToggle className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/30 hover:border-white/40 active:scale-95 cursor-pointer" />
  );
}
