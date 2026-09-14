import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/server/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
