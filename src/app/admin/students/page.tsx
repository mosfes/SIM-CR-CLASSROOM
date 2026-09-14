import { getUsersByRoleData } from "@/lib/server/admin-data";
import { StudentsContent } from "@/components/admin/students-content";

export default async function StudentsManagementPage() {
  const users = await getUsersByRoleData("STUDENT");

  const students = users.map((u) => ({
    id: u.id,
    role: "STUDENT" as const,
    studentId: u.studentId ?? "",
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));

  return <StudentsContent initialStudents={students} />;
}
