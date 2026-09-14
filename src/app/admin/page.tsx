import { getUsersOverviewData } from "@/lib/server/admin-data";
import { OverviewContent } from "@/components/admin/overview-content";

export default async function AdminOverviewPage() {
  const { users, stats } = await getUsersOverviewData();
  return <OverviewContent initialUsers={users} initialStats={stats} />;
}
