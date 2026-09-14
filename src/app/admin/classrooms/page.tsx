import { getClassroomsData } from "@/lib/server/admin-data";
import { ClassroomsContent } from "@/components/admin/classrooms-content";

export default async function ClassroomsManagementPage() {
  return <ClassroomsContent initialClassrooms={await getClassroomsData()} />;
}
