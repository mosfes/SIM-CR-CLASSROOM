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

  // Students can join from the lobby or after the teacher has started the game.
  const students = session.status === "ENDED" ? [] : await getEntryStudents();

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

  // Only compute the heavier per-student results breakdown once the round has
  // ended: the projector polls this snapshot every few seconds while running,
  // and this data is only surfaced in the end-of-game summary screen.
  const [doctorScoreRows, labScoreRows, pharmacyScoreRows] =
    session.status === "ENDED"
      ? await Promise.all([
          prisma.doctorDiagnosis.findMany({
            where: { simulationId },
            select: {
              groupId: true,
              doctorId: true,
              doctorName: true,
              isCorrect: true,
              evaluationScore: true,
            },
          }),
          prisma.labResult.findMany({
            where: { simulationId },
            select: {
              groupId: true,
              medTechId: true,
              medTechName: true,
              isCorrect: true,
              evaluationScore: true,
            },
          }),
          prisma.pharmacyDispense.findMany({
            where: { simulationId },
            select: {
              groupId: true,
              pharmacistId: true,
              pharmacistName: true,
              isCorrect: true,
              evaluationScore: true,
            },
          }),
        ])
      : [[], [], []];

  const buildGroupResults = (groupId: string) => {
    const groupDoctorRows = doctorScoreRows.filter((row) => row.groupId === groupId);
    const groupLabRows = labScoreRows.filter((row) => row.groupId === groupId);
    const groupPharmacyRows = pharmacyScoreRows.filter((row) => row.groupId === groupId);

    const diagnosedCount = groupDoctorRows.length;
    const correctCount = groupDoctorRows.filter((row) => row.isCorrect === true).length;
    const wrongCount = groupDoctorRows.filter((row) => row.isCorrect === false).length;
    const successRate = diagnosedCount > 0 ? Math.round((correctCount / diagnosedCount) * 100) : 0;

    const labCount = groupLabRows.length;
    const labCorrectCount = groupLabRows.filter((row) => row.isCorrect === true).length;
    const labWrongCount = groupLabRows.filter((row) => row.isCorrect === false).length;
    const labSuccessRate = labCount > 0 ? Math.round((labCorrectCount / labCount) * 100) : 0;

    // เคสของเภสัชกรที่บันทึกก่อนมีระบบตัวเลือก จะไม่มีคะแนน จึงไม่นับเป็นถูกหรือผิด
    const pharmacyRowsWithKey = groupPharmacyRows.filter((row) => row.isCorrect !== null);
    const pharmacyCount = pharmacyRowsWithKey.length;
    const pharmacyCorrectCount = pharmacyRowsWithKey.filter((row) => row.isCorrect === true).length;
    const pharmacyWrongCount = pharmacyRowsWithKey.filter((row) => row.isCorrect === false).length;
    const pharmacySuccessRate =
      pharmacyCount > 0 ? Math.round((pharmacyCorrectCount / pharmacyCount) * 100) : 0;

    const doctorScore = groupDoctorRows.reduce((sum, row) => sum + (row.evaluationScore ?? 0), 0);
    const labScore = groupLabRows.reduce((sum, row) => sum + (row.evaluationScore ?? 0), 0);
    const pharmacyScore = groupPharmacyRows.reduce(
      (sum, row) => sum + (row.evaluationScore ?? 0),
      0
    );

    const scoreByStudent = new Map<string, { name: string; score: number }>();
    for (const row of groupDoctorRows) {
      if (!row.doctorId) continue;
      const entry = scoreByStudent.get(row.doctorId) ?? { name: row.doctorName, score: 0 };
      entry.score += row.evaluationScore ?? 0;
      scoreByStudent.set(row.doctorId, entry);
    }
    for (const row of groupLabRows) {
      if (!row.medTechId) continue;
      const entry = scoreByStudent.get(row.medTechId) ?? { name: row.medTechName, score: 0 };
      entry.score += row.evaluationScore ?? 0;
      scoreByStudent.set(row.medTechId, entry);
    }
    for (const row of groupPharmacyRows) {
      if (!row.pharmacistId) continue;
      const entry = scoreByStudent.get(row.pharmacistId) ?? { name: row.pharmacistName, score: 0 };
      entry.score += row.evaluationScore ?? 0;
      scoreByStudent.set(row.pharmacistId, entry);
    }

    const totalScore = doctorScore + labScore + pharmacyScore;
    const topScorers = Array.from(scoreByStudent.entries())
      .map(([studentId, { name, score }]) => ({ studentId, name, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      diagnosedCount,
      correctCount,
      wrongCount,
      successRate,
      labCount,
      labCorrectCount,
      labWrongCount,
      labSuccessRate,
      pharmacyCount,
      pharmacyCorrectCount,
      pharmacyWrongCount,
      pharmacySuccessRate,
      doctorScore,
      labScore,
      pharmacyScore,
      totalScore,
      topScorers,
    };
  };

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
        results: session.status === "ENDED" ? buildGroupResults(group.id) : null,
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
