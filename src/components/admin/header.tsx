"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import type { AdminIdentity } from "@/lib/server/session";

interface HeaderProps {
  admin: AdminIdentity;
  onMenuToggle: () => void;
}

function initials(username: string): string {
  return username.trim().slice(0, 2).toUpperCase() || "AD";
}

export function Header({ admin, onMenuToggle }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-8 backdrop-blur-md">
      {/* Left side: Mobile Menu Button & Mobile Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="เปิดเมนู"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-100 bg-white">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-full w-full object-cover object-top scale-[1.7] origin-top translate-y-0.5"
            />
          </div>
          <span className="font-bold text-slate-900 text-sm">SIM CR Classroom</span>
        </div>
      </div>

      {/* Right side: User Profile Avatar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col text-right">
            <span className="max-w-40 truncate text-xs font-medium leading-none text-slate-800">
              {admin.name}
            </span>
            <span className="mt-0.5 max-w-40 truncate text-[10px] leading-tight text-slate-400">
              @{admin.username}
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-600 text-white text-xs font-bold shadow-xs shadow-rose-500/20">
            {initials(admin.username)}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
