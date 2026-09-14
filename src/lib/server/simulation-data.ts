import { Prisma } from "@prisma/client";
import { randomInt } from "crypto";
import type { PlayRoleId } from "@/lib/play/roles";
import { prisma } from "@/lib/prisma";
import {
  formatGroupNameForDisplay,
  getDefaultSimulationGroups,
} from "@/lib/simulation-groups";

const ROOM_CODE_PATTERN = /^\d{6}$/;
const PLAY_ROLE_IDS = new Set<PlayRoleId>([
  "card-room",
  "nurse",
  "medtech",
  "doctor",
  "pharmacist",
]);

export function normalizeRoomCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const roomCode = value.trim();
  return ROOM_CODE_PATTERN.test(roomCode) ? roomCode : null;
}

export function isPlayRoleId(value: unknown): value is PlayRoleId {
  return typeof value === "string" && PLAY_ROLE_IDS.has(value as PlayRoleId);
}

function createRoomCode() {
  return String(randomInt(100000, 1_000_000));
}

async function ensureSimulationGroups(classroomId: string) {
  const activeGroupCount = await prisma.classroomGroup.count({
    where: { classroomId, isActive: true },
  });

  if (activeGroupCount > 0) return;

  await prisma.classroomGroup.createMany({
    data: getDefaultSimulationGroups().map((group) => ({
      classroomId,
      ...group,
    })),
  });
}

export async function createSimulationSession({
  classroomId,
  createdById,
}: {
  classroomId: string;
  createdById: string;
}) {
  await ensureSimulationGroups(classroomId);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const session = await tx.simulationSession.create({
          data: {
            roomCode: createRoomCode(),
            classroomId,
            createdById,
          },
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
                groups: {
                  where: { isActive: true },
                  orderBy: { name: "asc" },
                  select: { id: true, name: true },
                },
              },
            },
          },
        });

        await tx.simulationQueueCounter.createMany({
          data: session.classroom.groups.map((group) => ({
            simulationId: session.id,
            groupId: group.id,
          })),
        });

        return {
          ...session,
          classroom: {
            ...session.classroom,
            groups: session.classroom.groups.map((group) => ({
              ...group,
              name: formatGroupNameForDisplay(group.name),
            })),
          },
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 7
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("ไม่สามารถสร้างรหัสห้องจำลองได้ กรุณาลองอีกครั้ง");
}

async function getEntryStudents() {
  return prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    orderBy: [{ studentId: "asc" }, { name: "asc" }],
    select: { id: true, studentId: true, name: true },
  });
}

export async function getSimulationSessionForEntry(roomCode: string) {
  const session = await prisma.simulationSession.findUnique({
    where: { roomCode },
    select: {
      id: true,
      roomCode: true,
      status: true,
      classroom: {
        select: {
          id: true,
          name: true,
          groups: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!session) return null;

  // Names are only needed while students can still join.
  const students = session.status === "LOBBY" ? await getEntryStudents() : [];

  return {
    id: session.id,
    roomCode: session.roomCode,
    status: session.status,
    classroom: {
      ...session.classroom,
      groups: session.classroom.groups.map((group) => ({
        ...group,
        name: formatGroupNameForDisplay(group.name),
      })),
    },
    students,
  };
}

export async function getRunningSimulationScope({
  simulationId,
  classroomId,
  groupId,
}: {
  simulationId: string;
  classroomId: string;
  groupId: string;
}) {
  return prisma.simulationSession.findFirst({
    where: {
      id: simulationId,
      classroomId,
      status: "RUNNING",
      classroom: {
        groups: {
          some: { id: groupId, isActive: true },
        },
      },
    },
    select: { id: true, classroomId: true, status: true },
  });
}

export async function getRunningSimulationParticipant({
  simulationId,
  studentId,
  classroomId,
  groupId,
  role,
}: {
  simulationId: string;
  studentId: string;
  classroomId: string;
  groupId: string;
  role: PlayRoleId;
}) {
  return prisma.simulationSession.findFirst({
    where: {
      id: simulationId,
      classroomId,
      status: "RUNNING",
      participants: {
        some: {
          studentId,
          groupId,
          role,
        },
      },
    },
    select: { id: true, classroomId: true, status: true },
  });
}

export async function getParticipantSessionContext({
  simulationId,
  studentId,
  requireRunning = false,
}: {
  simulationId: string;
  studentId: string;
  requireRunning?: boolean;
}) {
  const participant = await prisma.simulationParticipant.findUnique({
    where: {
      simulationId_studentId: { simulationId, studentId },
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      student: {
        select: { id: true, name: true, studentId: true, isActive: true },
      },
      group: {
        select: { id: true, name: true, classroomId: true, isActive: true },
      },
      simulation: {
        select: {
          id: true,
          roomCode: true,
          status: true,
          classroom: {
            select: {
              id: true,
              name: true,
              isActive: true,
              groups: {
                where: { isActive: true },
                orderBy: { name: "asc" },
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!participant || !participant.student.isActive || !participant.group.isActive) return null;
  if (!participant.simulation.classroom.isActive) return null;
  if (participant.group.classroomId !== participant.simulation.classroom.id) return null;
  if (requireRunning && participant.simulation.status !== "RUNNING") return null;
  if (!isPlayRoleId(participant.role)) return null;

  return {
    id: participant.id,
    role: participant.role,
    joinedAt: participant.joinedAt.toISOString(),
    student: {
      id: participant.student.id,
      name: participant.student.name,
      studentId: participant.student.studentId,
    },
    group: {
      id: participant.group.id,
      name: formatGroupNameForDisplay(participant.group.name),
    },
    simulation: {
      id: participant.simulation.id,
      roomCode: participant.simulation.roomCode,
      status: participant.simulation.status,
      classroom: {
        id: participant.simulation.classroom.id,
        name: participant.simulation.classroom.name,
        groups: participant.simulation.classroom.groups.map((group) => ({
          ...group,
          name: formatGroupNameForDisplay(group.name),
        })),
      },
    },
  };
}

// The lobby only needs enough state to decide whether to stay in the waiting
// room or navigate the participant to their role. Keep the richer context
// above for the role pages, where the classroom's active groups are needed.
export async function getLobbyParticipantState({
  simulationId,
  studentId,
}: {
  simulationId: string;
  studentId: string;
}) {
  const participant = await prisma.simulationParticipant.findUnique({
    where: {
      simulationId_studentId: { simulationId, studentId },
    },
    select: {
      role: true,
      student: {
        select: { id: true, name: true, isActive: true },
      },
      group: {
        select: { id: true, name: true, classroomId: true, isActive: true },
      },
      simulation: {
        select: {
          id: true,
          roomCode: true,
          status: true,
          classroom: {
            select: { id: true, name: true, isActive: true },
          },
        },
      },
    },
  });

  if (!participant || !participant.student.isActive || !participant.group.isActive) return null;
  if (!participant.simulation.classroom.isActive) return null;
  if (participant.group.classroomId !== participant.simulation.classroom.id) return null;
  if (!isPlayRoleId(participant.role)) return null;

  return {
    role: participant.role,
    student: {
      id: participant.student.id,
      name: participant.student.name,
    },
    group: {
      id: participant.group.id,
      name: formatGroupNameForDisplay(participant.group.name),
    },
    simulation: {
      id: participant.simulation.id,
      roomCode: participant.simulation.roomCode,
      status: participant.simulation.status,
      classroom: {
        id: participant.simulation.classroom.id,
        name: participant.simulation.classroom.name,
      },
    },
  };
}

export async function getSimulationSessionsForAdmin() {
  const [sessions, classrooms] = await Promise.all([
    prisma.simulationSession.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        roomCode: true,
        status: true,
        createdAt: true,
        startedAt: true,
        endedAt: true,
        classroom: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    sessions: sessions.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      participantCount: session._count.participants,
    })),
    classrooms,
  };
}

async function getSimulationSnapshotByWhere(where: Prisma.SimulationSessionWhereUniqueInput) {
  const session = await prisma.simulationSession.findUnique({
    where,
    select: {
      id: true,
      roomCode: true,
      status: true,
      createdAt: true,
      startedAt: true,
      endedAt: true,
      classroom: {
        select: {
          id: true,
          name: true,
          groups: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          groupId: true,
          joinedAt: true,
          student: { select: { id: true, name: true, studentId: true } },
        },
      },
    },
  });

  if (!session) return null;

  const simulationId = session.id;
  const [patientCards, nurseInterviews, labResults, doctorDiagnoses, pharmacyDispenses] =
    await Promise.all([
      prisma.patientCard.groupBy({
        by: ["groupId"],
        where: { simulationId },
        _count: { _all: true },
      }),
      prisma.nurseInterview.groupBy({
        by: ["groupId"],
        where: { simulationId },
        _count: { _all: true },
      }),
      prisma.labResult.groupBy({
        by: ["groupId"],
        where: { simulationId },
        _count: { _all: true },
      }),
      prisma.doctorDiagnosis.groupBy({
        by: ["groupId"],
        where: { simulationId },
        _count: { _all: true },
      }),
      prisma.pharmacyDispense.groupBy({
        by: ["groupId"],
        where: { simulationId },
        _count: { _all: true },
      }),
    ]);

  const makeCountMap = (rows: Array<{ groupId: string | null; _count: { _all: number } }>) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.groupId) continue;
      counts.set(row.groupId, row._count._all);
    }
    return counts;
  };

  const cardsByGroup = makeCountMap(patientCards);
  const nursesByGroup = makeCountMap(nurseInterviews);
  const labsByGroup = makeCountMap(labResults);
  const doctorsByGroup = makeCountMap(doctorDiagnoses);
  const pharmaciesByGroup = makeCountMap(pharmacyDispenses);

  const displayGroups = session.classroom.groups.map((group) => ({
    ...group,
    name: formatGroupNameForDisplay(group.name),
  }));

  const participants = session.participants
    .filter((participant) => isPlayRoleId(participant.role))
    .map((participant) => ({
      id: participant.id,
      role: participant.role as PlayRoleId,
      groupId: participant.groupId,
      joinedAt: participant.joinedAt.toISOString(),
      student: participant.student,
    }));

  return {
    id: session.id,
    roomCode: session.roomCode,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    classroom: {
      ...session.classroom,
      groups: displayGroups,
    },
    participantCount: participants.length,
    participants,
    groups: displayGroups.map((group) => {
      const members = participants.filter((participant) => participant.groupId === group.id);
      return {
        id: group.id,
        name: group.name,
        participants: members,
        work: {
          patientCards: cardsByGroup.get(group.id) ?? 0,
          nurseInterviews: nursesByGroup.get(group.id) ?? 0,
          labResults: labsByGroup.get(group.id) ?? 0,
          doctorDiagnoses: doctorsByGroup.get(group.id) ?? 0,
          pharmacyDispenses: pharmaciesByGroup.get(group.id) ?? 0,
        },
      };
    }),
  };
}

export async function getSimulationSnapshot(simulationId: string) {
  return getSimulationSnapshotByWhere({ id: simulationId });
}

export async function getSimulationSnapshotByRoomCode(roomCode: string) {
  return getSimulationSnapshotByWhere({ roomCode });
}
