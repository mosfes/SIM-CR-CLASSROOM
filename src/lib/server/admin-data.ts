import { prisma } from "@/lib/prisma";
import { parseLabResults } from "@/lib/disease-lab-results";

const userSelect = {
  id: true,
  role: true,
  studentId: true,
  username: true,
  firstName: true,
  lastName: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toIsoUser<T extends { createdAt: Date; updatedAt: Date }>(user: T) {
  return { ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() };
}

export async function getUsersOverviewData() {
  const [users, roleCounts, diseaseCount, classroomCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: userSelect,
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.disease.count(),
    prisma.classroom.count(),
  ]);

  let studentCount = 0;
  let adminCount = 0;
  for (const item of roleCounts) {
    if (item.role === "STUDENT") studentCount = item._count._all;
    if (item.role === "ADMIN") adminCount = item._count._all;
  }

  return {
    users: users.map(toIsoUser),
    stats: {
      total: studentCount + adminCount,
      students: studentCount,
      admins: adminCount,
      diseases: diseaseCount,
      classrooms: classroomCount,
    },
  };
}

export async function getUsersByRoleData(role: "STUDENT" | "ADMIN") {
  const users = await prisma.user.findMany({
    where: { role },
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
  return users.map(toIsoUser);
}

export async function getClassroomsData() {
  const classrooms = await prisma.classroom.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return classrooms.map((room) => ({
    ...room,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }));
}

export async function getDiseasesData() {
  const diseases = await prisma.disease.findMany({ orderBy: { createdAt: "desc" } });
  return diseases.map((d) => ({
    ...d,
    labResults: parseLabResults(d.labResults),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}
