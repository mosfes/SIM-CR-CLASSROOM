"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ChevronRight,
  Activity,
  School,
  ClipboardCheck,
  Gamepad2,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "ภาพรวม",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
      badge: null,
    },
    {
      label: "ควบคุมห้องจำลอง",
      href: "/admin/simulations",
      icon: Gamepad2,
      active: pathname.startsWith("/admin/simulations"),
      badge: "LIVE",
    },
    {
      label: "ติดตามการส่งตรวจ",
      href: "/admin/monitor",
      icon: ClipboardCheck,
      active: pathname.startsWith("/admin/monitor"),
      badge: "LIVE",
    },
    {
      label: "ห้องเรียน",
      href: "/admin/classrooms",
      icon: School,
      active: pathname.startsWith("/admin/classrooms"),
      badge: null,
    },
    {
      label: "นักเรียน",
      href: "/admin/students",
      icon: GraduationCap,
      active: pathname === "/admin/students",
      badge: null,
    },
    {
      label: "ผู้ใช้งาน (แอดมิน)",
      href: "/admin/admins",
      icon: Users,
      active: pathname === "/admin/admins",
      badge: null,
    },
    {
      label: "จัดการโรค",
      href: "/admin/diseases",
      icon: Activity,
      active: pathname === "/admin/diseases",
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:shadow-none"
        }`}
      >
        {/* Logo & Brand */}
        <div className="flex h-18 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="SIM CR Classroom Logo"
                width={50}
                height={50}
                className="h-full w-full object-cover object-top scale-[1.7] origin-top translate-y-0.5"
                priority
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-900 text-base tracking-tight truncate">SIM CR Classroom</span>
              <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 border border-red-200/60">ADMIN</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5">
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              เมนูหลัก
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    item.active
                      ? "bg-red-600 text-white shadow-sm shadow-red-500/25"
                      : "text-slate-600 hover:bg-red-50/60 hover:text-red-600"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        item.active ? "text-white" : "text-slate-400 group-hover:text-red-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.active
                          ? "bg-white/20 text-white"
                          : "bg-red-50 text-red-600 group-hover:bg-red-100"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.active && !item.badge && (
                    <ChevronRight className="h-4 w-4 text-white/70 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
