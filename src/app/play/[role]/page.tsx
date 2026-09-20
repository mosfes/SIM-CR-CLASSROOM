import Link from "next/link";
import { redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { getPlayRole } from "@/lib/play/roles";
import {
  getActiveDiseases,
  getAvailableDoctorDiagnoses,
  getAvailableNurseInterviews,
  getAvailablePatientCards,
  getLabPanels,
  getNurseChoiceOptions,
  getNurseInterviewsAwaitingLab,
  getPharmacyChoiceOptions,
} from "@/lib/server/play-data";
import { getParticipantSessionContext } from "@/lib/server/simulation-data";
import { ChangeRoleModal } from "@/components/play/change-role-modal";
import { DoctorDiagnosisForm } from "@/components/play/doctor-diagnosis-form";
import { MedTechLabForm } from "@/components/play/medtech-lab-form";
import { NurseInterviewForm } from "@/components/play/nurse-interview-form";
import { PatientCardForm } from "@/components/play/patient-card-form";
import { PharmacistDispenseForm } from "@/components/play/pharmacist-dispense-form";
import { StationShell } from "@/components/play/kit/station-shell";

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 bg-game-grid px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Construction className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">ไม่สามารถเปิดสถานีนี้ได้</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            ลิงก์ไม่สมบูรณ์ เกมยังไม่เริ่ม หรือรอบจำลองสิ้นสุดแล้ว กรุณาติดต่อคุณครูเพื่อขอคำแนะนำ
          </p>
          <Link
            href="/play"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            กลับไปใส่เลขห้อง
          </Link>
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

  const [availablePatientCards, nurseChoiceOptions] =
    role.id === "nurse"
      ? await Promise.all([
          getAvailablePatientCards(classroom.id, group.id, activeSimulationId),
          getNurseChoiceOptions(),
        ])
      : [[], { glands: [], hormones: [] }];
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
  const [availableDoctorDiagnoses, pharmacyChoiceOptions] =
    role.id === "pharmacist"
      ? await Promise.all([
          getAvailableDoctorDiagnoses(classroom.id, group.id, activeSimulationId),
          getPharmacyChoiceOptions(),
        ])
      : [[], { hormones: [], treatments: [] }];

  const stationForm =
    role.id === "card-room" ? (
      <PatientCardForm clerk={student} classroom={classroom} group={group} diseases={activeDiseases} simulationId={activeSimulationId} />
    ) : role.id === "nurse" ? (
      <NurseInterviewForm
        nurse={student}
        classroom={classroom}
        group={group}
        initialPatientCards={availablePatientCards}
        glandOptions={nurseChoiceOptions.glands}
        hormoneOptions={nurseChoiceOptions.hormones}
        simulationId={activeSimulationId}
      />
    ) : role.id === "medtech" ? (
      <MedTechLabForm medTech={student} classroom={classroom} group={group} initialLabQueue={labQueue} labPanels={labPanels} simulationId={activeSimulationId} />
    ) : role.id === "doctor" ? (
      <DoctorDiagnosisForm doctor={student} classroom={classroom} group={group} initialNurseInterviews={availableNurseInterviews} diseases={activeDiseases} simulationId={activeSimulationId} />
    ) : (
      <PharmacistDispenseForm
        pharmacist={student}
        classroom={classroom}
        group={group}
        initialDoctorDiagnoses={availableDoctorDiagnoses}
        hormoneOptions={pharmacyChoiceOptions.hormones}
        treatmentOptions={pharmacyChoiceOptions.treatments}
        simulationId={activeSimulationId}
      />
    );

  return (
    <StationShell
      roleId={role.id}
      roomCode={participant.simulation.roomCode}
      student={student}
      classroomName={classroom.name}
      groupName={group.name}
      actions={
        <ChangeRoleModal
          currentRoleId={role.id}
          studentId={student.id}
          simulationId={activeSimulationId}
          roomCode={participant.simulation.roomCode}
          currentGroupId={group.id}
          groups={classroom.groups}
        />
      }
    >
      {stationForm}
    </StationShell>
  );
}
