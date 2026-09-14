"use client";

import { createContext, useContext, useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";
import type { AdminIdentity } from "@/lib/server/session";

const AdminContext = createContext<AdminIdentity | null>(null);

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminIdentity;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminContext.Provider value={admin}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
          <Header admin={admin} onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
