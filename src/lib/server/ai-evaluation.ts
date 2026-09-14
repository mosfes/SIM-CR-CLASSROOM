const KKU_AI_API_BASE_URL =
  process.env.KKU_AI_API_BASE_URL || "https://gen.ai.kku.ac.th/api/v1";
const KKU_AI_API_KEY = process.env.KKU_AI_API_KEY?.trim();
const FALLBACK_MODELS = [
  process.env.KKU_AI_MODEL || "gemini-3.8-flash",
  "claude-sonnet-5",
  "gpt-5.6-terra",
];

export interface DiagnosisEvaluationInput {
  patient: {
    prefix: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    maritalStatus: string;
    weightKg?: number | null;
    heightCm?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulseBpm?: number | null;
    chronicDiseaseStatus?: string | null;
    chronicDiseaseDetails?: string | null;
    chiefComplaint?: string | null;
    symptomDescription: string;
    nurseNotes?: string | null;
  };
  lab?: {
    items: { name: string; result: string; referenceRange: string }[];
    notes?: string | null;
  } | null;
  disease: {
    code: string;
    name: string;
    symptoms?: string | null;
  };
  doctorDiagnosis: {
    diagnosisText: string;
    treatmentPlan?: string | null;
    notes?: string | null;
  };
}

export interface DiagnosisEvaluationResult {
  success: boolean;
  score: number | null;
  strengths: string | null;
  feedback: string | null;
  aiAvailable: boolean;
  modelUsed?: string | null;
}

export async function evaluateDoctorDiagnosisWithAI(
  input: DiagnosisEvaluationInput
): Promise<DiagnosisEvaluationResult> {
  if (!KKU_AI_API_KEY) {
    console.warn("[AI Eval] KKU_AI_API_KEY is not configured; skipping AI evaluation.");
    return createUnavailableFallback();
  }

  const { patient, disease, doctorDiagnosis, lab } = input;

  const vitalsText = [
    patient.systolicBp && patient.diastolicBp ? `ความดันโลหิต: ${patient.systolicBp}/${patient.diastolicBp} mmHg` : null,
    patient.pulseBpm ? `ชีพจร: ${patient.pulseBpm} bpm` : null,
    patient.weightKg ? `น้ำหนัก: ${patient.weightKg} kg` : null,
    patient.heightCm ? `ส่วนสูง: ${patient.heightCm} cm` : null,
  ].filter(Boolean).join(", ") || "ไม่มีข้อมูลสัญญาณชีพ";

  const labText = lab?.items?.length
    ? lab.items
        .map(
          (item) =>
            `${item.name}: ${item.result}${item.referenceRange ? ` (ค่าอ้างอิง ${item.referenceRange})` : ""}`
        )
        .join("; ")
    : "ไม่มีผลตรวจทางห้องปฏิบัติการ";

  const systemPrompt = `คุณคืออาจารย์แพทย์ผู้เชี่ยวชาญ ทำหน้าที่ตรวจ ประเมิน และให้คะแนนผลการวินิจฉัยโรคของนักเรียน (นักศึกษาแพทย์ระดับจำลองห้องเรียน)

บริบทเคสผู้ป่วย:
- ผู้ป่วย: ${patient.prefix}${patient.firstName} ${patient.lastName}, อายุ ${patient.age} ปี, เพศ ${patient.gender}
- รายละเอียดอาการจากพยาบาล (Symptoms): ${patient.symptomDescription}
- สัญญาณชีพ: ${vitalsText}
- โรคประจำตัว: ${patient.chronicDiseaseStatus === "YES" ? patient.chronicDiseaseDetails || "มีโรคประจำตัว" : patient.chronicDiseaseStatus === "NONE" ? "ไม่มี" : "ไม่ทราบ"}
${patient.nurseNotes ? `- บันทึกพยาบาลเพิ่มเติม: ${patient.nurseNotes}` : ""}
- ผลตรวจทางห้องปฏิบัติการที่เทคนิคการแพทย์ส่งมา: ${labText}
${lab?.notes ? `- หมายเหตุจากห้องปฏิบัติการ: ${lab.notes}` : ""}

โรคที่ถูกต้องของเคสนี้: ${disease.name} (รหัส: ${disease.code})
${disease.symptoms ? `อาการทั่วไปของโรคนี้: ${disease.symptoms}` : ""}

สิ่งที่นักเรียนแพทย์บันทึก:
- การวินิจฉัยโรค (Doctor Diagnosis): "${doctorDiagnosis.diagnosisText}"
${doctorDiagnosis.treatmentPlan ? `- แผนการรักษา (Treatment Plan): "${doctorDiagnosis.treatmentPlan}"` : ""}
${doctorDiagnosis.notes ? `- บันทึกเพิ่มเติม: "${doctorDiagnosis.notes}"` : ""}

เกณฑ์การประเมิน:
1. เคสนี้ได้รับการยืนยันว่านักเรียน "เลือกโรคถูกต้อง" แล้ว
2. ให้คะแนนเต็ม 10 คะแนน โดยพิจารณาจาก:
   - ความละเอียดในการบรรยายและการให้เหตุผลทางการแพทย์ (4 คะแนน)
   - ความสอดคล้องกับอาการสำคัญ สัญญาณชีพ ผลตรวจทางห้องปฏิบัติการ และประวัติผู้ป่วย (3 คะแนน)
   - ความสมบูรณ์ของแผนการรักษาและบันทึกเพิ่มเติม (3 คะแนน)
   (ช่วงคะแนนควรอยู่ระหว่าง 1 ถึง 10 คะแนน โดยหากเขียนได้ดี ละเอียด สมเหตุสมผล ควรได้ 8-10 คะแนน)
3. ต้องวิเคราะห์และชื่นชมจุดเด่นอย่างอบอุ่นและสร้างสรรค์ เช่น "เก่งมาก มีจุดนี้ที่อธิบายได้โอเค อธิบายได้ดีเลยที่บอกมาแบบนี้..." และชี้ให้เห็นสิ่งที่นักเรียนสังเกตเห็นได้ดี
4. ให้คำแนะนำเพิ่มเติมที่เป็นประโยชน์ในการเป็นแพทย์

คุณต้องตอบกลับเป็น JSON เท่านั้นในรูปแบบต่อไปนี้ (ห้ามมี Markdown code block ครอบ หรือถ้ามีให้ตัดออกได้):
{
  "score": <ตัวเลขจำนวนเต็ม 1 ถึง 10>,
  "strengths": "<ข้อความคำชมเชย ระบุจุดเด่นที่ทำได้ดี เช่น เก่งมาก มีจุดนี้ที่อธิบายได้โอเค อธิบายได้ดีเลยที่...>",
  "feedback": "<การวิเคราะห์ความละเอียด การให้เหตุผลทางการแพทย์ และคำแนะนำเพิ่มเติม>"
}`;

  for (const model of FALLBACK_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per model

      const response = await fetch(`${KKU_AI_API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KKU_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "กรุณาประเมินการวินิจฉัยของนักเรียนตามเกณฑ์และตอบเป็น JSON ตามโครงสร้างที่กำหนด" },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(
          `[AI Eval] Model ${model} returned error status ${response.status}: ${errText}. Trying next fallback model...`
        );
        continue;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        console.warn(`[AI Eval] Model ${model} returned empty content. Trying next fallback model...`);
        continue;
      }

      // Clean markdown fences if any
      const cleanedContent = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanedContent) as {
        score?: unknown;
        strengths?: unknown;
        feedback?: unknown;
      };

      const rawScore = Number(parsed.score);
      const score = Number.isFinite(rawScore) ? Math.min(10, Math.max(1, Math.round(rawScore))) : 8;
      const strengths =
        typeof parsed.strengths === "string" && parsed.strengths.trim()
          ? parsed.strengths.trim()
          : "เก่งมาก วินิจฉัยโรคได้ถูกต้องและระบุข้อมูลผู้ป่วยได้สอดคล้องกับอาการ";
      const feedback =
        typeof parsed.feedback === "string" && parsed.feedback.trim()
          ? parsed.feedback.trim()
          : "การบรรยายการวินิจฉัยมีความสอดคล้องกับผลตรวจและอาการของผู้ป่วย";

      return {
        success: true,
        score,
        strengths,
        feedback,
        aiAvailable: true,
        modelUsed: model,
      };
    } catch (error) {
      console.warn(`[AI Eval] Model ${model} failed with error:`, error, ". Trying next fallback model...");
    }
  }

  // If all models in the fallback chain fail:
  return createUnavailableFallback();
}

function createUnavailableFallback(): DiagnosisEvaluationResult {
  return {
    success: false,
    score: null,
    strengths: null,
    feedback: "ระบบ AI ตรวจประเมินไม่สามารถใช้งานได้ชั่วคราว",
    aiAvailable: false,
  };
}
