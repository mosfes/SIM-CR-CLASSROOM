"use client";

import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  HeartPulse,
  Pill,
  Printer,
  RefreshCw,
  Sparkles,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react";
import { formatPatientCode } from "@/lib/patient-code";
import {
  SCORE_MAXIMUMS,
  formatDateTime,
  formatScore,
  type MedicineItem,
  type SubmissionItem,
} from "./shared";

function ScoreSummary({
  nurseScore,
  doctorScore,
  medTechScore,
  pharmacistScore,
}: {
  nurseScore: number | null | undefined;
  doctorScore: number | null | undefined;
  medTechScore: number | null | undefined;
  pharmacistScore: number | null | undefined;
}) {
  const scoredParts = [nurseScore, doctorScore, medTechScore, pharmacistScore].filter(
    (score): score is number => typeof score === "number"
  );

  if (scoredParts.length === 0) return null;

  const totalScore = scoredParts.reduce((sum, score) => sum + score, 0);
  const chipClass = "inline-flex items-center gap-1 rounded-xl border bg-white px-2.5 py-1.5";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3" aria-label="สรุปคะแนน">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
        สรุปคะแนนประเมิน
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${chipClass} border-emerald-300 text-emerald-800`}>
          <span>รวมทั้งหมด</span>
          <strong className="font-mono text-emerald-900">
            {formatScore(totalScore, SCORE_MAXIMUMS.total)}
          </strong>
        </span>
        <span className={`${chipClass} border-emerald-200 text-emerald-800`}>
          <span>พยาบาล</span>
          <strong className="font-mono">{formatScore(nurseScore ?? 0, SCORE_MAXIMUMS.nurse)}</strong>
        </span>
        <span className={`${chipClass} border-sky-200 text-sky-800`}>
          <span>แพทย์</span>
          <strong className="font-mono">{formatScore(doctorScore, SCORE_MAXIMUMS.doctor)}</strong>
        </span>
        <span className={`${chipClass} border-indigo-200 text-indigo-800`}>
          <span>เทคนิคการแพทย์</span>
          <strong className="font-mono">
            {formatScore(medTechScore ?? 0, SCORE_MAXIMUMS.medTech)}
          </strong>
        </span>
        <span className={`${chipClass} border-fuchsia-200 text-fuchsia-800`}>
          <span>เภสัชกร</span>
          <strong className="font-mono">
            {formatScore(pharmacistScore ?? 0, SCORE_MAXIMUMS.pharmacist)}
          </strong>
        </span>
      </div>
    </div>
  );
}

/** โมดัลเวชระเบียนฉบับเต็ม — id / data-pdf-* ใช้กับการส่งออก PDF ห้ามเปลี่ยน */
export function DossierModal({
  submission: selectedSubmission,
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div id="printable-medical-record" className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                รหัสผู้ป่วย {formatPatientCode(selectedSubmission.queueNumber)}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {selectedSubmission.group.name}
              </span>
              <span className="text-xs text-slate-400">
                ห้องเรียน: {selectedSubmission.classroom.name}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              บันทึกเวชระเบียนผู้ป่วย: {selectedSubmission.patient.fullName}
            </h3>
          </div>
          <button
            type="button"
            data-pdf-ignore
            onClick={() => onClose()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div data-pdf-block className="mt-4">
          <ScoreSummary
            nurseScore={selectedSubmission.nurse?.evaluationScore}
            doctorScore={selectedSubmission.doctor?.evaluationScore}
            medTechScore={selectedSubmission.lab?.evaluationScore}
            pharmacistScore={selectedSubmission.pharmacy?.evaluationScore}
          />
        </div>

        {/* Modal Content */}
        <div className="mt-5 space-y-6 text-sm">
          {/* Patient Basic Profile */}
          <div data-pdf-block className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ข้อมูลประจำตัวผู้ป่วย (จากห้องบัตร)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">ชื่อ-นามสกุล:</span>
                <p className="font-bold text-slate-800">{selectedSubmission.patient.fullName}</p>
              </div>
              <div>
                <span className="text-slate-400">อายุ:</span>
                <p className="font-bold text-slate-800">{selectedSubmission.patient.age} ปี</p>
              </div>
              <div>
                <span className="text-slate-400">เพศ:</span>
                <p className="font-bold text-slate-800">{selectedSubmission.patient.gender}</p>
              </div>
              <div>
                <span className="text-slate-400">สถานภาพ:</span>
                <p className="font-bold text-slate-800">
                  {selectedSubmission.patient.maritalStatus}
                </p>
              </div>
              <div>
                <span className="text-slate-400">เจ้าหน้าที่ออกบัตร:</span>
                <p className="font-bold text-slate-800">
                  {selectedSubmission.cardRoom.clerkName}
                </p>
              </div>
              <div>
                <span className="text-slate-400">เวลาออกบัตร:</span>
                <p className="font-bold text-slate-800">
                  {formatDateTime(selectedSubmission.cardRoom.createdAt)}
                </p>
              </div>
              <div className="col-span-2 rounded-xl bg-amber-100/70 p-2 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800">
                  เฉลยรหัสโรคที่ห้องบัตรตั้งไว้:
                </span>
                <p className="font-mono text-sm font-black text-amber-950">
                  {selectedSubmission.cardRoom.diseaseCode || "(ไม่ได้ระบุ)"}
                </p>
              </div>
            </div>
          </div>

          {/* Station 2: Nurse Info */}
          <div data-pdf-block className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4" /> บันทึกการซักประวัติและสัญญาณชีพ (พยาบาล)
              </h4>
              {selectedSubmission.nurse && (
                <span className="text-xs text-slate-500">
                  โดย: <strong>{selectedSubmission.nurse.nurseName}</strong> ·{" "}
                  {formatDateTime(selectedSubmission.nurse.createdAt)}
                </span>
              )}
            </div>

            {selectedSubmission.nurse ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl bg-white p-2 border border-emerald-100">
                    <span className="text-slate-400">ความดันโลหิต</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.nurse.systolicBp}/{selectedSubmission.nurse.diastolicBp}{" "}
                      mmHg
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-emerald-100">
                    <span className="text-slate-400">ชีพจร</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.nurse.pulseBpm} bpm
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-emerald-100">
                    <span className="text-slate-400">น้ำหนัก / ส่วนสูง</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.nurse.weightKg} กก. / {selectedSubmission.nurse.heightCm}{" "}
                      ซม.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-emerald-100">
                    <span className="text-slate-400">โรคประจำตัว</span>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.nurse.chronicDiseaseStatus === "YES"
                        ? selectedSubmission.nurse.chronicDiseaseDetails
                        : selectedSubmission.nurse.chronicDiseaseStatus === "NONE"
                        ? "ไม่มี"
                        : "ไม่ทราบ"}
                    </p>
                  </div>
                </div>

                <div data-pdf-block className="rounded-xl bg-white p-3 border border-emerald-100 space-y-2">
                  <div>
                    <span className="text-slate-400 font-semibold">อาการจากโรค:</span>
                    <p className="whitespace-pre-wrap font-medium text-slate-800 mt-0.5">
                      {selectedSubmission.nurse.symptomDescription}
                    </p>
                  </div>
                  {selectedSubmission.nurse.notes && (
                    <div>
                      <span className="text-slate-400 font-semibold">หมายเหตุ:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedSubmission.nurse.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedSubmission.nurse.endocrineGlandChoice && (
                  <div data-pdf-block className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          [
                            "ต่อมไร้ท่อที่ผิดปกติ",
                            selectedSubmission.nurse.endocrineGlandChoice,
                            selectedSubmission.nurse.isGlandCorrect,
                          ],
                          [
                            "ฮอร์โมนที่ผิดปกติ",
                            selectedSubmission.nurse.abnormalHormoneChoice,
                            selectedSubmission.nurse.isHormoneCorrect,
                          ],
                        ] as const
                      ).map(([heading, choice, correct]) => (
                        <div
                          key={heading}
                          className={`rounded-xl border p-3 ${
                            correct === true
                              ? "border-emerald-200 bg-emerald-50/60"
                              : correct === false
                                ? "border-rose-200 bg-rose-50/60"
                                : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-bold text-slate-500">{heading}</span>
                            <span
                              className={`font-bold ${
                                correct === true
                                  ? "text-emerald-700"
                                  : correct === false
                                    ? "text-rose-600"
                                    : "text-slate-400"
                              }`}
                            >
                              {correct === true ? "ถูกต้อง" : correct === false ? "ไม่ถูกต้อง" : "ไม่มีเฉลย"}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800">{choice}</p>
                        </div>
                      ))}
                    </div>
                    {selectedSubmission.nurse.evaluationScore !== null && (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white p-3 text-sm font-bold">
                        <span>คะแนนสถานีพยาบาล:</span>
                        <span className="text-emerald-900">
                          {selectedSubmission.nurse.evaluationScore}/{SCORE_MAXIMUMS.nurse}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">ยังไม่มีการบันทึกจากพยาบาล</p>
            )}
          </div>

          {/* Station 3: Lab Result */}
          <div data-pdf-block className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" /> ผลตรวจทางห้องปฏิบัติการ (เทคนิคการแพทย์)
              </h4>
              {selectedSubmission.lab && (
                <span className="text-xs text-slate-500">
                  โดย: <strong>{selectedSubmission.lab.medTechName}</strong> ·{" "}
                  {formatDateTime(selectedSubmission.lab.createdAt)}
                </span>
              )}
            </div>

            {selectedSubmission.lab ? (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 font-bold text-indigo-900">
                    ชุดผลตรวจ: {selectedSubmission.lab.panelDiseaseName}
                    {selectedSubmission.lab.panelDiseaseCode
                      ? ` (${selectedSubmission.lab.panelDiseaseCode})`
                      : ""}
                  </span>
                  {selectedSubmission.lab.isCorrect === null ? (
                    <span className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 font-bold text-slate-500">
                      ห้องบัตรไม่ได้ระบุเฉลย
                    </span>
                  ) : selectedSubmission.lab.isCorrect ? (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ชุดตรวจตรงเฉลย
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
                      <XCircle className="h-3.5 w-3.5" /> ชุดตรวจไม่ตรงเฉลย
                    </span>
                  )}
                  {selectedSubmission.lab.evaluationScore !== null && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-black font-mono ${
                        selectedSubmission.lab.isCorrect
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-rose-300 bg-rose-50 text-rose-700"
                      }`}
                    >
                      คะแนน: {selectedSubmission.lab.evaluationScore}/2
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-slate-400">
                        <th className="px-3 py-2 font-bold">รายการตรวจ</th>
                        <th className="px-3 py-2 font-bold">ผลตรวจ</th>
                        <th className="px-3 py-2 font-bold">ค่าอ้างอิง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubmission.lab.items.map((item, idx) => (
                        <tr key={`${item.name}-${idx}`} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-3 py-2 font-bold text-indigo-700">{item.result}</td>
                          <td className="px-3 py-2 text-slate-500">{item.referenceRange || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedSubmission.lab.notes && (
                  <div className="rounded-xl bg-white p-3 border border-indigo-100">
                    <span className="text-slate-400 font-semibold">หมายเหตุจากห้องแล็บ:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {selectedSubmission.lab.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">ยังไม่มีการส่งผลตรวจจากเทคนิคการแพทย์</p>
            )}
          </div>

          {/* Station 4: Doctor Diagnosis */}
          <div data-pdf-block className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4" /> บันทึกการวินิจฉัยโรค (แพทย์)
              </h4>
              {selectedSubmission.doctor && (
                <span className="text-xs text-slate-500">
                  โดย: <strong>{selectedSubmission.doctor.doctorName}</strong> ·{" "}
                  {formatDateTime(selectedSubmission.doctor.createdAt)}
                </span>
              )}
            </div>

            {selectedSubmission.doctor ? (
              <div className="space-y-3 text-xs">
                {/* Diagnosis Comparison Card */}
                <div className="rounded-xl bg-white p-3 border border-sky-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-slate-400">โรคที่แพทย์วินิจฉัย:</span>
                      <p className="text-sm font-black text-sky-900">
                        {selectedSubmission.doctor.diseaseName}{" "}
                        <span className="font-mono text-xs text-slate-400">
                          (รหัส: {selectedSubmission.doctor.diseaseCode})
                        </span>
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-bold ${
                          selectedSubmission.diagnosisEvaluation === "CORRECT"
                            ? "bg-emerald-100 text-emerald-800"
                            : selectedSubmission.diagnosisEvaluation === "INCORRECT"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {selectedSubmission.diagnosisEvaluation === "CORRECT" ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>ตรงกับเฉลยของห้องบัตร</span>
                          </>
                        ) : selectedSubmission.diagnosisEvaluation === "INCORRECT" ? (
                          <>
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>ไม่ตรงกับเฉลยของห้องบัตร</span>
                          </>
                        ) : (
                          <span>ไม่มีเฉลยรหัสโรค</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold">รายละเอียดการวินิจฉัยของแพทย์:</span>
                    <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-line">
                      {selectedSubmission.doctor.doctorDiagnosis}
                    </p>
                  </div>

                  {/* AI Evaluation Card */}
                  {selectedSubmission.doctor.evaluationScore !== undefined && selectedSubmission.doctor.evaluationScore !== null ? (
                    <div data-pdf-block className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2.5 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/60 pb-2">
                        <div className="flex items-center gap-2 font-bold text-sky-900">
                          <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
                          <span>การประเมินและให้คะแนนโดย AI:</span>
                          {selectedSubmission.doctor.aiModel && (
                            <span className="inline-flex items-center rounded-lg bg-white border border-sky-200 px-2 py-0.5 text-[11px] font-mono font-bold text-sky-700 shadow-2xs">
                              {selectedSubmission.doctor.aiModel}
                            </span>
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-black shadow-2xs border border-sky-200">
                          <span className="text-slate-500">คะแนน:</span>
                          <span
                            className={`text-sm ${
                              selectedSubmission.doctor.isCorrect ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {selectedSubmission.doctor.evaluationScore}
                          </span>
                          <span className="text-slate-400">/ 10</span>
                        </div>
                      </div>

                      {selectedSubmission.doctor.aiStrengths && (
                        <div data-pdf-block className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 space-y-1 text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" /> จุดเด่นที่ทำได้ดี:
                          </span>
                          <p className="text-amber-950 font-medium leading-relaxed pl-4">
                            {selectedSubmission.doctor.aiStrengths}
                          </p>
                        </div>
                      )}

                      {selectedSubmission.doctor.aiFeedback && (
                        <div data-pdf-block className="rounded-lg bg-white border border-sky-100 p-2.5 space-y-1 text-xs">
                          <span className="font-bold text-sky-900">
                            บทวิเคราะห์และความเห็นทางการแพทย์:
                          </span>
                          <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-line pl-1">
                            {selectedSubmission.doctor.aiFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1.5 mt-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>สถานะ AI: ใช้งานไม่ได้ชั่วคราว</span>
                      </div>
                      <p className="text-amber-950 font-medium pl-6">
                        {selectedSubmission.doctor.aiFeedback ||
                          "ระบบ AI ไม่สามารถประเมินผลได้ในขณะที่แพทย์ส่งผล แต่ระบบได้ทำการบันทึกและตรวจสอบความถูกต้องของโรคเรียบร้อยแล้ว"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">ยังไม่มีการตรวจวินิจฉัยจากแพทย์</p>
            )}
          </div>

          {/* Station 5: Pharmacy Dispense */}
          <div data-pdf-block className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fuchsia-800 flex items-center gap-1.5">
                <Pill className="h-4 w-4" /> บันทึกการจ่ายยา (เภสัชกร)
              </h4>
              {selectedSubmission.pharmacy && (
                <span className="text-xs text-slate-500">
                  โดย: <strong>{selectedSubmission.pharmacy.pharmacistName}</strong> ·{" "}
                  {formatDateTime(selectedSubmission.pharmacy.createdAt)}
                </span>
              )}
            </div>

            {selectedSubmission.pharmacy ? (
              selectedSubmission.pharmacy.hormoneChoiceKey ? (
                <div className="space-y-2 text-xs">
                  {(
                    [
                      [
                        "ความผิดปกติของฮอร์โมน (A-U)",
                        selectedSubmission.pharmacy.hormoneChoiceKey,
                        selectedSubmission.pharmacy.hormoneChoiceLabel,
                        selectedSubmission.pharmacy.isHormoneCorrect,
                      ],
                      [
                        "ยา/การรักษา (ก-ธ)",
                        selectedSubmission.pharmacy.treatmentChoiceKey,
                        selectedSubmission.pharmacy.treatmentChoiceLabel,
                        selectedSubmission.pharmacy.isTreatmentCorrect,
                      ],
                    ] as const
                  ).map(([heading, choiceKey, choiceLabel, correct]) => (
                    <div
                      key={heading}
                      className={`rounded-xl border p-3 ${
                        correct === true
                          ? "border-emerald-200 bg-emerald-50/60"
                          : correct === false
                            ? "border-rose-200 bg-rose-50/60"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-bold text-slate-500">{heading}</span>
                        <span
                          className={`font-bold ${
                            correct === true
                              ? "text-emerald-700"
                              : correct === false
                                ? "text-rose-600"
                                : "text-slate-400"
                          }`}
                        >
                          {correct === true ? "ถูกต้อง" : correct === false ? "ไม่ถูกต้อง" : "ไม่มีเฉลย"}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-fuchsia-600 text-[10px] font-black text-white">
                          {choiceKey}
                        </span>
                        {choiceLabel}
                      </p>
                    </div>
                  ))}
                  {selectedSubmission.pharmacy.evaluationScore !== null && (
                    <div className="flex items-center justify-between rounded-xl border border-fuchsia-100 bg-white p-3 text-sm font-bold">
                      <span>คะแนนสถานีห้องยา:</span>
                      <span className="text-fuchsia-900">
                        {selectedSubmission.pharmacy.evaluationScore}/{SCORE_MAXIMUMS.pharmacist}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl bg-white p-3 border border-fuchsia-100">
                    <div className="flex items-center justify-between font-bold text-slate-700 border-b border-slate-100 pb-2 mb-2">
                      <span>รายการยาที่จ่าย</span>
                      <span>จำนวนเม็ด</span>
                    </div>
                    <div className="space-y-1.5">
                      {Array.isArray(selectedSubmission.pharmacy.medicines) &&
                        (selectedSubmission.pharmacy.medicines as MedicineItem[]).map((med, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="font-medium text-slate-800">
                              {idx + 1}. {med.name}
                            </span>
                            <span className="font-bold text-fuchsia-900">
                              {med.tabletCount} เม็ด
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
                      <span>ยอดรวมยาทั้งหมด:</span>
                      <span className="text-fuchsia-900">
                        {selectedSubmission.pharmacy.totalTablets ?? 0} เม็ด
                      </span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">ยังไม่มีการจ่ายยาจากห้องยา</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          data-pdf-ignore
          className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4"
        >
          {exportError && (
            <p className="mr-auto text-xs font-semibold text-red-600">{exportError}</p>
          )}
          <button
            type="button"
            disabled={exportingPdf}
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingPdf ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            {exportingPdf ? "กำลังสร้าง PDF..." : "ส่งออก PDF"}
          </button>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
