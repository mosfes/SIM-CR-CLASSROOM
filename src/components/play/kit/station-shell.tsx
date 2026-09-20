import type { ReactNode } from "react";
import Image from "next/image";
import { School, Users } from "lucide-react";
import { GameSoundStarter } from "@/components/play/game-sound-starter";
import { PLAY_ROLES, type PlayRoleId } from "@/lib/play/roles";
import { ROLE_THEME } from "./theme";

/**
 * เปลือกหน้าของสถานี: แถบบนที่ค้างอยู่ (ห้อง เสียง เปลี่ยนบทบาท) + แถบบอกว่าใครอยู่ห้องไหน
 * ตัวสถานีแต่ละแบบเป็น children
 */
export function StationShell({
  roleId,
  roomCode,
  student,
  classroomName,
  groupName,
  actions,
  children,
}: {
  roleId: PlayRoleId;
  roomCode: string;
  student: { name: string; studentId: string | null };
  classroomName: string;
  groupName: string;
  /** ปุ่มเปลี่ยนบทบาท */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const theme = ROLE_THEME[roleId];
  const role = PLAY_ROLES.find((item) => item.id === roleId)!;
  const RoleIcon = role.icon;

  return (
    <main className="min-h-screen bg-slate-50 bg-game-grid pb-6 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2.5 px-3 sm:gap-3 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5">
            <Image src="/logo.png" alt="โลโก้" width={32} height={32} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none text-slate-900">
              SIM CR <span className="text-red-600">Classroom</span>
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
              ห้องจำลอง <span className="font-mono tracking-wider">{roomCode}</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black sm:inline-flex ${theme.soft}`}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {role.label}
            </span>
            <GameSoundStarter />
            {actions}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 pb-20 sm:px-6 sm:py-6 sm:pb-24">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3.5 shadow-xs">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${theme.gradient}`}
            >
              {student.name.trim().replace(/^(นางสาว|น\.ส\.|นาย|นาง)\s*/, "")[0] ?? "?"}
            </span>
            <span className="min-w-0 text-sm font-bold leading-tight text-slate-800">
              <span className="block truncate">{student.name}</span>
              {student.studentId && (
                <span className="block truncate font-mono text-[11px] font-medium text-slate-400">
                  {student.studentId}
                </span>
              )}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xs">
            <School className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{classroomName}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xs">
            <Users className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            {groupName}
          </span>
        </div>

        {children}
      </div>
    </main>
  );
}
