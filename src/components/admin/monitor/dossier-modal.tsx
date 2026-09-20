"use client";

import { useEffect, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Printer,
  RefreshCw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { formatPatientCode } from "@/lib/patient-code";
import { StageChip } from "./stage-chip";
import {
  SCORE_MAXIMUMS,
  STATIONS,
  TONES,
  formatDateTime,
  scoreClasses,
  type MedicineItem,
  type StationKey,
  type SubmissionItem,
} from "./shared";

const STATION_TITLES: Record<StationKey, string> = {
  card: "ห้องบัตร · ข้อมูลผู้ป่วย",
  nurse: "พยาบาล · ซักประวัติและสัญญาณชีพ",
  lab: "เทคนิคการแพทย์ · ผลตรวจห้องปฏิบัติการ",
  doctor: "แพทย์ · การวินิจฉัยโรค",
  pharmacy: "เภสัชกร · การจ่ายยา",
};

// class ต้องเขียนเป็นข้อความเต็มเพื่อให้ Tailwind สแกนเจอ
function answerCardClasses(correct: boolean | null | undefined) {
  if (correct === true) return "border-emerald-200 bg-emerald-50/70";
  if (correct === false) return "border-rose-200 bg-rose-50/70";
  return "border-slate-200 bg-white";
}

/** ป้ายผลตรวจคำตอบเทียบเฉลย: ถูกต้อง / ไม่ถูกต้อง / ไม่มีเฉลย */
function Verdict({
  correct,
  labels = ["ถูกต้อง", "ไม่ถูกต้อง", "ไม่มีเฉลย"],
}: {
  correct: boolean | null | undefined;
  labels?: [string, string, string];
}) {
  if (correct === true) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        {labels[0]}
      </span>
    );
  }
  if (correct === false) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
        <XCircle className="h-3 w-3" />
        {labels[1]}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
      {labels[2]}
    </span>
  );
}

function ScoreBadge({
  score,
  maximum,
  correct,
}: {
  score: number | null | undefined;
  maximum: number;
  correct?: boolean | null;
}) {
  if (typeof score !== "number") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-xs font-black tabular-nums ${scoreClasses(score, maximum, correct)}`}
    >
      <span className="font-sans text-[11px] font-semibold opacity-80">คะแนน</span>
      {score}/{maximum}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-bold text-slate-800">{children}</p>
    </div>
  );
}

/** กล่องคำตอบของนักเรียน พร้อมผลเทียบเฉลย */
function AnswerCard({
  heading,
  correct,
  badge,
  children,
}: {
  heading: string;
  correct: boolean | null | undefined;
  badge?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3 ${answerCardClasses(correct)}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">{heading}</span>
        <Verdict correct={correct} />
      </div>
      <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-slate-800">
        {badge && (
          <span className="mt-px flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-fuchsia-600 px-1 text-[11px] font-black text-white">
            {badge}
          </span>
        )}
        <span className="min-w-0 break-words">{children}</span>
      </p>
    </div>
  );
}

function TextBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-sm font-medium leading-relaxed text-slate-800">
        {children}
      </p>
    </div>
  );
}

/** สรุปคะแนนรวมและคะแนนแต่ละสถานี — สถานีที่ยังไม่ตรวจแสดง "—" */
function ScoreSummary({ submission }: { submission: SubmissionItem }) {
  const { nurse, lab, doctor, pharmacy } = submission;
  const rows: Array<{
    key: StationKey;
    label: string;
    score: number | null | undefined;
    maximum: number;
    correct?: boolean | null;
  }> = [
    { key: "nurse", label: "พยาบาล", score: nurse?.evaluationScore, maximum: SCORE_MAXIMUMS.nurse },
    {
      key: "lab",
      label: "เทคนิคการแพทย์",
      score: lab?.evaluationScore,
      maximum: SCORE_MAXIMUMS.medTech,
      correct: lab?.isCorrect,
    },
    {
      key: "doctor",
      label: "แพทย์",
      score: doctor?.evaluationScore,
      maximum: SCORE_MAXIMUMS.doctor,
      correct: doctor?.isCorrect,
    },
    {
      key: "pharmacy",
      label: "เภสัชกร",
      score: pharmacy?.evaluationScore,
      maximum: SCORE_MAXIMUMS.pharmacist,
    },
  ];

  const scored = rows.filter((row): row is typeof row & { score: number } => typeof row.score === "number");
  if (scored.length === 0) return null;

  const total = scored.reduce((sum, row) => sum + row.score, 0);
  const percent = Math.min(100, (total / SCORE_MAXIMUMS.total) * 100);
  const bar = percent >= 70 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div data-pdf-block className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="สรุปคะแนนประเมิน">
      <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-900 p-3 text-white sm:col-span-1">
        <p className="text-[11px] font-semibold text-slate-300">คะแนนรวม</p>
        <p className="mt-0.5 font-mono text-2xl font-black leading-none tabular-nums">
          {total}
          <span className="text-sm font-bold text-slate-400">/{SCORE_MAXIMUMS.total}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
      {rows.map((row) => {
        const station = STATIONS.find((s) => s.key === row.key)!;
        const Icon = station.icon;
        return (
          <div key={row.key} className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className={`flex items-center gap-1.5 text-[11px] font-semibold ${TONES[station.tone].text}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{row.label}</span>
            </p>
            <p className="mt-1.5">
              <span
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-sm font-black tabular-nums ${scoreClasses(row.score, row.maximum, row.correct)}`}
              >
                {typeof row.score === "number" ? row.score : "—"}/{row.maximum}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** หนึ่งสถานีบน timeline: จุดสีบอกความคืบหน้า หัวข้อ ผู้บันทึก เวลา และเนื้อหา */
function StationSection({
  stationKey,
  isLast = false,
  filled,
  by,
  at,
  badge,
  emptyText,
  children,
}: {
  stationKey: StationKey;
  isLast?: boolean;
  filled: boolean;
  by?: string;
  at?: string;
  badge?: ReactNode;
  emptyText: string;
  children?: ReactNode;
}) {
  const station = STATIONS.find((s) => s.key === stationKey)!;
  const tone = TONES[station.tone];
  const Icon = station.icon;
  const index = STATIONS.indexOf(station) + 1;

  return (
    <section data-pdf-block className="relative pl-12">
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[17px] top-10 -bottom-5 w-0.5 rounded-full ${
            filled ? tone.bar : "bg-slate-200"
          }`}
        />
      )}
      <span
        className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full ${
          filled ? `${tone.solid} shadow-xs` : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <header className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h4 className={`text-sm font-bold leading-tight ${filled ? tone.text : "text-slate-400"}`}>
            {index}. {STATION_TITLES[stationKey]}
          </h4>
          {filled && by && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              โดย <strong className="font-semibold text-slate-700">{by}</strong>
              {at && <> · {formatDateTime(at)}</>}
            </p>
          )}
        </div>
        {filled && badge}
      </header>

      {filled ? (
        <div className="mt-3 space-y-3">{children}</div>
      ) : (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-xs italic text-slate-400">
          {emptyText}
        </p>
      )}
    </section>
  );
}

/** โมดัลเวชระเบียนฉบับเต็ม — id / data-pdf-* ใช้กับการส่งออก PDF ห้ามเปลี่ยน */
export function DossierModal({
  submission,
  onClose,
  onExport,
  exportingPdf,
  exportError,
}: {
  submission: SubmissionItem;
  onClose: () => void;
  onExport: () => void;
  exportingPdf: boolean;
  exportError: string | null;
}) {
  const { patient, cardRoom, nurse, lab, doctor, pharmacy } = submission;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const chronicDisease = !nurse
    ? ""
    : nurse.chronicDiseaseStatus === "YES"
      ? nurse.chronicDiseaseDetails
      : nurse.chronicDiseaseStatus === "NONE"
        ? "ไม่มี"
        : "ไม่ทราบ";

  const medicines = Array.isArray(pharmacy?.medicines) ? (pharmacy.medicines as MedicineItem[]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-xs animate-in fade-in duration-200 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* โครงแบบ flex (หัว / เนื้อหาเลื่อนได้ / ท้าย) ไม่ใช้ sticky เพื่อให้จับภาพลง PDF ได้ครบ */}
      <div
        id="printable-medical-record"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* หัวเวชระเบียน */}
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/70">
          <div className="h-1.5 bg-red-600" />
          <div className="flex items-start gap-3.5 px-4 py-4 sm:gap-4 sm:px-6">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-red-600 text-white shadow-xs">
              <span className="text-[10px] font-semibold leading-none opacity-80">รหัส</span>
              <span className="mt-0.5 text-xl font-black leading-none tabular-nums">
                {formatPatientCode(submission.queueNumber)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400">บันทึกเวชระเบียนผู้ป่วย</p>
              <h3 id="dossier-title" className="break-words text-xl font-bold leading-snug text-slate-900">
                {patient.fullName}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                อายุ {patient.age} ปี · เพศ {patient.gender} · สถานภาพ {patient.maritalStatus}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <StageChip stage={submission.stage} label={submission.stageLabel} />
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                  {submission.group.name}
                </span>
                <span className="text-slate-400">ห้องเรียน: {submission.classroom.name}</span>
              </div>
            </div>

            <button
              type="button"
              data-pdf-ignore
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* เนื้อหา (เลื่อนได้) */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <ScoreSummary submission={submission} />

          <div className="space-y-6">
            {/* 1. ห้องบัตร */}
            <StationSection
              stationKey="card"
              filled
              by={cardRoom.clerkName}
              at={cardRoom.createdAt}
              emptyText=""
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  cardRoom.diseaseCode ? "border-amber-200 bg-amber-50" : "border-dashed border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    cardRoom.diseaseCode ? "text-amber-800" : "text-slate-400"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  เฉลยรหัสโรคที่ห้องบัตรตั้งไว้
                </span>
                <span
                  className={`font-mono text-sm font-black ${
                    cardRoom.diseaseCode ? "text-amber-950" : "font-sans font-medium text-slate-400"
                  }`}
                >
                  {cardRoom.diseaseCode || "(ไม่ได้ระบุ)"}
                </span>
              </div>
            </StationSection>

            {/* 2. พยาบาล */}
            <StationSection
              stationKey="nurse"
              filled={!!nurse}
              by={nurse?.nurseName}
              at={nurse?.createdAt}
              badge={<ScoreBadge score={nurse?.evaluationScore} maximum={SCORE_MAXIMUMS.nurse} />}
              emptyText="ยังไม่มีการบันทึกจากพยาบาล"
            >
              {nurse && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="ความดันโลหิต">
                      {nurse.systolicBp}/{nurse.diastolicBp} mmHg
                    </Stat>
                    <Stat label="ชีพจร">{nurse.pulseBpm} bpm</Stat>
                    <Stat label="น้ำหนัก / ส่วนสูง">
                      {nurse.weightKg} กก. / {nurse.heightCm} ซม.
                    </Stat>
                    <Stat label="โรคประจำตัว">{chronicDisease}</Stat>
                  </div>

                  <div data-pdf-block className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <TextBlock label="อาการจากโรค">{nurse.symptomDescription}</TextBlock>
                    {nurse.notes && <TextBlock label="หมายเหตุ">{nurse.notes}</TextBlock>}
                  </div>

                  {nurse.endocrineGlandChoice && (
                    <div data-pdf-block className="grid gap-2 sm:grid-cols-2">
                      <AnswerCard heading="ต่อมไร้ท่อที่ผิดปกติ" correct={nurse.isGlandCorrect}>
                        {nurse.endocrineGlandChoice}
                      </AnswerCard>
                      <AnswerCard heading="ฮอร์โมนที่ผิดปกติ" correct={nurse.isHormoneCorrect}>
                        {nurse.abnormalHormoneChoice}
                      </AnswerCard>
                    </div>
                  )}
                </>
              )}
            </StationSection>

            {/* 3. เทคนิคการแพทย์ */}
            <StationSection
              stationKey="lab"
              filled={!!lab}
              by={lab?.medTechName}
              at={lab?.createdAt}
              badge={
                <ScoreBadge score={lab?.evaluationScore} maximum={SCORE_MAXIMUMS.medTech} correct={lab?.isCorrect} />
              }
              emptyText="ยังไม่มีการส่งผลตรวจจากเทคนิคการแพทย์"
            >
              {lab && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-bold text-indigo-900">
                      ชุดผลตรวจ: {lab.panelDiseaseName}
                      {lab.panelDiseaseCode ? ` (${lab.panelDiseaseCode})` : ""}
                    </span>
                    <Verdict
                      correct={lab.isCorrect}
                      labels={["ชุดตรวจตรงเฉลย", "ชุดตรวจไม่ตรงเฉลย", "ห้องบัตรไม่ได้ระบุเฉลย"]}
                    />
                  </div>

                  <div data-pdf-block className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                          <th className="px-3 py-2 font-bold">รายการตรวจ</th>
                          <th className="px-3 py-2 font-bold">ผลตรวจ</th>
                          <th className="px-3 py-2 font-bold">ค่าอ้างอิง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lab.items.map((item, idx) => (
                          <tr key={`${item.name}-${idx}`} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                            <td className="px-3 py-2 font-bold text-indigo-700">{item.result}</td>
                            <td className="px-3 py-2 text-slate-500">{item.referenceRange || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {lab.notes && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <TextBlock label="หมายเหตุจากห้องแล็บ">{lab.notes}</TextBlock>
                    </div>
                  )}
                </>
              )}
            </StationSection>

            {/* 4. แพทย์ */}
            <StationSection
              stationKey="doctor"
              filled={!!doctor}
              by={doctor?.doctorName}
              at={doctor?.createdAt}
              emptyText="ยังไม่มีการตรวจวินิจฉัยจากแพทย์"
            >
              {doctor && (
                <>
                  <div data-pdf-block className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">โรคที่แพทย์วินิจฉัย</p>
                        <p className="text-base font-black leading-snug text-sky-900">
                          {doctor.diseaseName}{" "}
                          <span className="font-mono text-xs font-bold text-slate-400">
                            (รหัส {doctor.diseaseCode})
                          </span>
                        </p>
                      </div>
                      <Verdict
                        correct={
                          submission.diagnosisEvaluation === "CORRECT"
                            ? true
                            : submission.diagnosisEvaluation === "INCORRECT"
                              ? false
                              : null
                        }
                        labels={["ตรงกับเฉลยของห้องบัตร", "ไม่ตรงกับเฉลยของห้องบัตร", "ไม่มีเฉลยรหัสโรค"]}
                      />
                    </div>
                    <div className="border-t border-sky-100 pt-3">
                      <TextBlock label="รายละเอียดการวินิจฉัยของแพทย์">{doctor.doctorDiagnosis}</TextBlock>
                    </div>
                  </div>

                  {typeof doctor.evaluationScore === "number" ? (
                    <div data-pdf-block className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-sky-900">
                          <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
                          ประเมินและให้คะแนนโดย AI
                          {doctor.aiModel && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                              {doctor.aiModel}
                            </span>
                          )}
                        </div>
                        <ScoreBadge
                          score={doctor.evaluationScore}
                          maximum={SCORE_MAXIMUMS.doctor}
                          correct={doctor.isCorrect}
                        />
                      </div>

                      {doctor.aiStrengths && (
                        <div data-pdf-block className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                          <p className="flex items-center gap-1 text-xs font-bold text-amber-900">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" /> จุดเด่นที่ทำได้ดี
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm font-medium leading-relaxed text-amber-950">
                            {doctor.aiStrengths}
                          </p>
                        </div>
                      )}

                      {doctor.aiFeedback && (
                        <div data-pdf-block>
                          <TextBlock label="บทวิเคราะห์และความเห็นทางการแพทย์">{doctor.aiFeedback}</TextBlock>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                      <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        สถานะ AI: ใช้งานไม่ได้ชั่วคราว
                      </p>
                      <p className="mt-1 pl-6 text-sm font-medium text-amber-950">
                        {doctor.aiFeedback ||
                          "ระบบ AI ไม่สามารถประเมินผลได้ในขณะที่แพทย์ส่งผล แต่ระบบได้ทำการบันทึกและตรวจสอบความถูกต้องของโรคเรียบร้อยแล้ว"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </StationSection>

            {/* 5. เภสัชกร */}
            <StationSection
              stationKey="pharmacy"
              isLast
              filled={!!pharmacy}
              by={pharmacy?.pharmacistName}
              at={pharmacy?.createdAt}
              badge={<ScoreBadge score={pharmacy?.evaluationScore} maximum={SCORE_MAXIMUMS.pharmacist} />}
              emptyText="ยังไม่มีการจ่ายยาจากห้องยา"
            >
              {pharmacy &&
                (pharmacy.hormoneChoiceKey ? (
                  <div data-pdf-block className="grid gap-2 sm:grid-cols-2">
                    <AnswerCard
                      heading="ความผิดปกติของฮอร์โมน (A-U)"
                      correct={pharmacy.isHormoneCorrect}
                      badge={pharmacy.hormoneChoiceKey}
                    >
                      {pharmacy.hormoneChoiceLabel}
                    </AnswerCard>
                    <AnswerCard
                      heading="ยา/การรักษา (ก-ธ)"
                      correct={pharmacy.isTreatmentCorrect}
                      badge={pharmacy.treatmentChoiceKey}
                    >
                      {pharmacy.treatmentChoiceLabel}
                    </AnswerCard>
                  </div>
                ) : (
                  <div data-pdf-block className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                      <span>รายการยาที่จ่าย</span>
                      <span>จำนวนเม็ด</span>
                    </div>
                    <ul className="divide-y divide-slate-100 text-sm">
                      {medicines.map((med, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="font-medium text-slate-800">
                            {idx + 1}. {med.name}
                          </span>
                          <span className="shrink-0 font-bold text-fuchsia-900">{med.tabletCount} เม็ด</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-fuchsia-50/60 px-3 py-2.5 text-sm font-bold">
                      <span className="text-slate-700">ยอดรวมยาทั้งหมด</span>
                      <span className="text-fuchsia-900">{pharmacy.totalTablets ?? 0} เม็ด</span>
                    </div>
                  </div>
                ))}
            </StationSection>
          </div>
        </div>

        {/* ท้ายโมดัล — ไม่ถูกใส่ลงไฟล์ PDF */}
        <footer
          data-pdf-ignore
          className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3.5 sm:px-6"
        >
          {exportError && (
            <p role="alert" className="mr-auto text-xs font-semibold text-red-600">
              {exportError}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            disabled={exportingPdf}
            onClick={onExport}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-red-600/25 transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            {exportingPdf ? "กำลังสร้าง PDF..." : "ส่งออก PDF"}
          </button>
        </footer>
      </div>
    </div>
  );
}
