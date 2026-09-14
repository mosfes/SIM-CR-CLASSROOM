import { getUsersByRoleData } from "@/lib/server/admin-data";
import { AdminsContent } from "@/components/admin/admins-content";

export default async function AdminsManagementPage() {
  const users = await getUsersByRoleData("ADMIN");
  const admins = users.map((u) => ({
    id: u.id,
    role: "ADMIN" as const,
    username: u.username ?? "",
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
  return <AdminsContent initialAdmins={admins} />;
}
