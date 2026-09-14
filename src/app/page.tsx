"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";
import { PLAY_ROLES } from "@/lib/play/roles";
import { LogoMark } from "@/components/brand/logo-mark";
import { SoundToggle } from "@/components/play/sound-toggle";
import {
  playHover,
  playClick,
  playSuccess,
  startMenuMusic,
} from "@/lib/play/sound";

const DECORATIONS = [
  { Icon: PLAY_ROLES[0].icon, top: "12%", left: "8%", delay: "0s", size: "h-9 w-9", color: "text-amber-400" },
  { Icon: PLAY_ROLES[1].icon, top: "20%", left: "85%", delay: "0.6s", size: "h-10 w-10", color: "text-emerald-400" },
  { Icon: PLAY_ROLES[2].icon, top: "72%", left: "10%", delay: "1.1s", size: "h-8 w-8", color: "text-sky-400" },
  { Icon: PLAY_ROLES[3].icon, top: "78%", left: "88%", delay: "0.3s", size: "h-9 w-9", color: "text-fuchsia-400" },
];

export default function Home() {
  useEffect(() => {
    // Attempt to start bright music automatically
    startMenuMusic();

    // Silently unlock music on first interaction anywhere without any visual overlay
    const onUserInteraction = () => {
      startMenuMusic();
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };

    window.addEventListener("pointerdown", onUserInteraction, { once: true });
    window.addEventListener("keydown", onUserInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-red-50/60 via-white to-slate-50 px-6 text-[#17233e]">
      {/* Sound Toggle top right */}
      <div className="absolute top-5 right-5 z-20">
        <SoundToggle />
      </div>

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-100/40 blur-3xl" />

      {/* Floating role icons */}
      {DECORATIONS.map(({ Icon, top, left, delay, size, color }, i) => (
        <div
          key={i}
          className="animate-float-slow pointer-events-none absolute hidden opacity-40 sm:block"
          style={{ top, left, animationDelay: delay }}
        >
          <Icon className={`${size} ${color}`} strokeWidth={1.75} />
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo mark — graduation cap + heartbeat pulse */}
        <div className="animate-bob mb-5 h-28 w-28 overflow-hidden rounded-3xl shadow-xl shadow-red-500/20">
          <LogoMark className="h-full w-full" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-normal text-slate-900 sm:text-6xl">
          SIM CR <span className="text-red-600">Classroom</span>
        </h1>
        <p className="mb-9 mt-2.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-2xl font-bold tracking-normal text-transparent sm:text-3xl">
          ห้องเรียนครูหน่อย
        </p>

        {/* Chunky game-style CTA */}
        <Link
          href="/play"
          onMouseEnter={playHover}
          onClick={playSuccess}
          className="animate-pulse-glow group inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-red-800 bg-red-600 px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-700 active:translate-y-1 active:border-b-0 cursor-pointer"
        >
          <Gamepad2 className="h-5 w-5" />
          <span>เริ่ม</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Role preview strip */}
        <div className="mt-10 flex items-center gap-3">
          {PLAY_ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                type="button"
                title={role.label}
                onMouseEnter={playHover}
                onClick={playClick}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${role.gradient} text-white shadow-md transition-transform hover:-translate-y-1 active:scale-95 cursor-pointer`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-14 text-xs text-slate-400">
          Developed by{" "}
          <a
            href="https://me.mosapps.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 hover:text-red-600 hover:underline transition-colors"
          >
            mosapps
          </a>
        </p>
      </div>
    </main>
  );
}
