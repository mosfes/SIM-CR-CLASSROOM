import Image from "next/image";
import { redirect } from "next/navigation";
import { Construction, School, UserRound, Users } from "lucide-react";
import { getPlayRole } from "@/lib/play/roles";
import {
  getActiveDiseases,
  getAvailableDoctorDiagnoses,
  getAvailableNurseInterviews,
  getAvailablePatientCards,
  getLabPanels,
  getNurseInterviewsAwaitingLab,
} from "@/lib/server/play-data";
import { getParticipantSessionContext } from "@/lib/server/simulation-data";
import { ChangeRoleModal } from "@/components/play/change-role-modal";
import { DoctorDiagnosisForm } from "@/components/play/doctor-diagnosis-form";
import { GameSoundStarter } from "@/components/play/game-sound-starter";
import { MedTechLabForm } from "@/components/play/medtech-lab-form";
import { NurseInterviewForm } from "@/components/play/nurse-interview-form";
import { PatientCardForm } from "@/components/play/patient-card-form";
import { PharmacistDispenseForm } from "@/components/play/pharmacist-dispense-form";

export const dynamic = "force-dynamic";

export default async function PlayRoleDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ student?: string; session?: string }>;
}) {
  const { role: roleParam } = await params;
  const { student: studentId, session: simulationId } = await searchParams;
  const role = getPlayRole(roleParam);

  const participant =
    role && simulationId && studentId
      ? await getParticipantSessionContext({
          simulationId,
          studentId,
          requireRunning: true,
        })
      : null;

  if (!role || !participant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 bg-game-grid px-6">
        <div className="w-full max-w-sm rounded-3xl border-2 border-slate-200 border-b-6 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-md shadow-red-500/20">
            <Construction className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">ไม่สามารถเปิดสถานีนี้ได้</h1>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
            ลิงก์ไม่สมบูรณ์ เกมยังไม่เริ่ม หรือรอบจำลองสิ้นสุดแล้ว กรุณาติดต่อคุณครูเพื่อขอคำแนะนำ
          </p>
        </div>
      </main>
    );
  }

  const activeSimulationId = simulationId as string;
  const activeStudentId = studentId as string;

  if (participant.role !== role.id) {
    redirect(`/play/${participant.role}?session=${activeSimulationId}&student=${activeStudentId}`);
  }

  const classroom = participant.simulation.classroom;
  const group = participant.group;
  const student = participant.student;

  const availablePatientCards =
    role.id === "nurse"
      ? await getAvailablePatientCards(classroom.id, group.id, activeSimulationId)
      : [];
  const activeDiseases =
    role.id === "card-room" || role.id === "doctor" ? await getActiveDiseases() : [];
  const availableNurseInterviews =
    role.id === "doctor"
      ? await getAvailableNurseInterviews(classroom.id, group.id, activeSimulationId)
      : [];
  const [labQueue, labPanels] =
    role.id === "medtech"
      ? await Promise.all([
          getNurseInterviewsAwaitingLab(classroom.id, group.id, activeSimulationId),
          getLabPanels(),
        ])
      : [[], []];
  const availableDoctorDiagnoses =
    role.id === "pharmacist"
      ? await getAvailableDoctorDiagnoses(classroom.id, group.id, activeSimulationId)
      : [];

  const Icon = role.icon;

  return (
    <main className="min-h-screen bg-slate-50 bg-game-grid pb-12 text-slate-800">
      <div className={`border-b-4 border-black/10 bg-gradient-to-r ${role.gradient} px-4 py-6 text-white shadow-lg`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-2 ring-white/40 backdrop-blur-md">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">MISSION ACTIVE</span>
                <span className="text-xs font-bold text-white/80">ห้อง {participant.simulation.roomCode}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">{role.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GameSoundStarter />
            <div className="relative hidden h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-1 shadow-md sm:flex">
              <Image src="/logo.png" alt="โลโก้" width={40} height={40} className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm">
            <UserRound className="h-4 w-4 text-teal-500" />
            <span>{student.name}</span>
            {student.studentId && <span className="font-mono text-slate-400">· {student.studentId}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm">
            <School className="h-4 w-4 text-amber-500" /> ห้องเรียน: {classroom.name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm">
            <Users className="h-4 w-4 text-emerald-500" /> ห้องตรวจ: {group.name}
          </span>
          <ChangeRoleModal
            currentRoleId={role.id}
            studentId={student.id}
            simulationId={activeSimulationId}
            roomCode={participant.simulation.roomCode}
            currentGroupId={group.id}
            groups={classroom.groups}
          />
        </div>

        {role.id === "card-room" ? (
          <PatientCardForm clerk={student} classroom={classroom} group={group} diseases={activeDiseases} simulationId={activeSimulationId} />
        ) : role.id === "nurse" ? (
          <NurseInterviewForm nurse={student} classroom={classroom} group={group} initialPatientCards={availablePatientCards} simulationId={activeSimulationId} />
        ) : role.id === "medtech" ? (
          <MedTechLabForm medTech={student} classroom={classroom} group={group} initialLabQueue={labQueue} labPanels={labPanels} simulationId={activeSimulationId} />
        ) : role.id === "doctor" ? (
          <DoctorDiagnosisForm doctor={student} classroom={classroom} group={group} initialNurseInterviews={availableNurseInterviews} diseases={activeDiseases} simulationId={activeSimulationId} />
        ) : (
          <PharmacistDispenseForm pharmacist={student} classroom={classroom} group={group} initialDoctorDiagnoses={availableDoctorDiagnoses} simulationId={activeSimulationId} />
        )}
      </div>
    </main>
  );
}
