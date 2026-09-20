/**
 * ตัวเลือกของสถานีพยาบาล: ต่อมไร้ท่อที่ผิดปกติ และฮอร์โมนที่ผิดปกติ
 *
 * ต่างจากสถานีห้องยาตรงที่ตัวเลือกหนึ่งเป็นคำตอบของหลายโรคได้ (เช่น "ต่อมไทรอยด์" ถูกใช้กับ
 * 6 โรค) จึงไม่มีตัวอักษรกำกับ ตัวเลือกคือข้อความเอง และรายการตัวเลือกที่นักเรียนเห็นคือ
 * ค่าที่ไม่ซ้ำกันของเฉลยทุกโรคที่ครูกรอกไว้ ร่วมกับ "ตัวลวง" (ตัวเลือกที่ไม่ใช่คำตอบของโรคใดเลย)
 *
 * ไฟล์นี้เก็บชุดข้อมูลตั้งต้นตามใบงาน "รหัส / โรค / ต่อมไร้ท่อที่ผิดปกติ / ฮอร์โมนที่ผิดปกติ"
 * พร้อมตัวลวง (ใช้ seed ตอน migrate) กับฟังก์ชันรวมตัวเลือก ให้คะแนน และตรวจข้อมูลที่ครูกรอก
 */

export interface NurseChoiceSeedRow {
  diseaseCode: string;
  gland: string;
  hormone: string;
}

/**
 * ค่าตั้งต้นของทั้ง 21 กรณีศึกษา เรียงตามรหัสโรค
 *
 * ใบงานเขียนชื่อเดียวกันไว้หลายแบบ จึงปรับให้เป็นข้อความเดียวเพื่อไม่ให้ตัวเลือกซ้ำกัน:
 *  - "พาราไทรอยด์" (003) → "ต่อมพาราไทรอยด์"
 *  - "ตับอ่อน (α-cell)" (009) และ "ตับอ่อน (β-cell)" (011) → "ตับอ่อน"
 */
export const NURSE_CHOICE_SEED: NurseChoiceSeedRow[] = [
  { diseaseCode: "001", gland: "ต่อมพาราไทรอยด์", hormone: "Parathyroid hormone" },
  { diseaseCode: "002", gland: "ต่อมพาราไทรอยด์", hormone: "Parathyroid hormone" },
  { diseaseCode: "003", gland: "ต่อมพาราไทรอยด์", hormone: "Parathyroid hormone" },
  { diseaseCode: "004", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
  { diseaseCode: "005", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
  { diseaseCode: "006", gland: "ต่อมพาราไทรอยด์", hormone: "Parathyroid hormone" },
  { diseaseCode: "007", gland: "ต่อมพาราไทรอยด์", hormone: "Parathyroid hormone" },
  { diseaseCode: "008", gland: "ตับอ่อน", hormone: "Insulin" },
  { diseaseCode: "009", gland: "ตับอ่อน", hormone: "Insulin" },
  { diseaseCode: "010", gland: "ต่อมใต้สมองส่วนหลัง", hormone: "ADH (Vasopressin)" },
  { diseaseCode: "011", gland: "ตับอ่อน", hormone: "Insulin" },
  { diseaseCode: "012", gland: "ต่อมใต้สมองส่วนหน้า", hormone: "Growth hormone (GH)" },
  { diseaseCode: "013", gland: "ต่อมใต้สมองส่วนหน้า", hormone: "Growth hormone (GH)" },
  { diseaseCode: "014", gland: "ต่อมใต้สมองส่วนหน้า", hormone: "Growth hormone (GH)" },
  { diseaseCode: "015", gland: "ต่อมใต้สมองส่วนหน้า", hormone: "Growth hormone (GH)" },
  { diseaseCode: "016", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
  { diseaseCode: "017", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
  { diseaseCode: "018", gland: "ต่อมหมวกไตชั้นนอก", hormone: "Cortisol" },
  { diseaseCode: "019", gland: "ต่อมหมวกไตชั้นนอก", hormone: "Aldosterone" },
  { diseaseCode: "020", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
  { diseaseCode: "021", gland: "ต่อมไทรอยด์", hormone: "T3, T4" },
];

/**
 * ตัวลวงตามใบงานฉบับที่ 2 — ตัวเลือกที่ไม่ใช่คำตอบของโรคใดเลย (ใช้ seed ตอน migrate)
 * ครูเพิ่ม/ลบได้จากหน้าจัดการข้อมูลโรค ข้อความคงตามใบงาน
 */
export const NURSE_DECOY_SEED = {
  glands: ["ต่อมไพเนียล", "ต่อมไทมัส", "ต่อมหมวกไตชั้นใน", "รังไข่", "อัณฑะ"],
  hormones: [
    "Prolactin",
    "ACTH",
    "oxytocin",
    "Adrenalin hormone",
    "Noradrenalin hormone",
    "Calcitonin",
    "Testosterone",
    "Estrogen",
    "Progesterone",
    "Melatonin",
    "Thymosin",
    "FSH",
    "LH",
  ],
};

export const NURSE_DECOY_MAX_ITEMS = 100;

/** คะแนนเต็มของสถานีพยาบาล: ต้องตอบถูกทั้งต่อมไร้ท่อและฮอร์โมนจึงได้ 1 คะแนน ถูกข้อเดียวได้ 0 */
export const NURSE_MAX_SCORE = 1;
export const NURSE_CHOICE_LABEL_MAX_LENGTH = 191;

/** ตัดช่องว่างหัวท้ายและยุบช่องว่างซ้อนให้เหลือช่องเดียว */
export function cleanChoiceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** คีย์สำหรับเทียบว่าสองข้อความคือตัวเลือกเดียวกัน (ไม่สนตัวพิมพ์เล็กใหญ่/ช่องว่างเกิน) */
export function choiceMatchKey(value: string | null | undefined) {
  return cleanChoiceText(value ?? "").toLowerCase();
}

interface DiseaseNurseChoices {
  endocrineGland?: string | null;
  abnormalHormone?: string | null;
}

function mergeChoices(values: Array<string | null | undefined>) {
  const merged = new Map<string, string>();
  for (const value of values) {
    const clean = cleanChoiceText(value ?? "");
    if (clean && !merged.has(choiceMatchKey(clean))) merged.set(choiceMatchKey(clean), clean);
  }
  // เรียงตามตัวอักษร ไม่เรียงตามลำดับโรค เพื่อไม่ให้เดาได้ว่าข้อไหนเป็นตัวลวง
  return [...merged.values()].sort((a, b) => a.localeCompare(b, "th", { sensitivity: "base" }));
}

/**
 * รวมตัวเลือกที่นักเรียนเห็น = คำตอบของทุกโรค + ตัวลวง ตัดข้อความซ้ำ และเรียงตามตัวอักษร
 * (ลำดับไม่บอกใบ้ว่าตัวไหนเป็นคำตอบของโรค)
 */
export function buildNurseChoiceOptions(
  diseases: DiseaseNurseChoices[],
  decoys: { glands: string[]; hormones: string[] } = { glands: [], hormones: [] }
) {
  return {
    glands: mergeChoices([...diseases.map((d) => d.endocrineGland), ...decoys.glands]),
    hormones: mergeChoices([...diseases.map((d) => d.abnormalHormone), ...decoys.hormones]),
  };
}

/**
 * ตรวจรายการตัวลวงที่ครูส่งมา (ข้อความละบรรทัด) ตัดบรรทัดว่างและข้อความซ้ำ
 * โยน Error เป็นข้อความภาษาไทยเพื่อส่งกลับไปแสดงให้ผู้ใช้
 */
export function normalizeNurseDecoyList(value: unknown, fieldLabel: string) {
  if (!Array.isArray(value)) throw new Error(`รูปแบบรายการ${fieldLabel}ไม่ถูกต้อง`);
  if (value.length > NURSE_DECOY_MAX_ITEMS) {
    throw new Error(`${fieldLabel}มีได้ไม่เกิน ${NURSE_DECOY_MAX_ITEMS} รายการ`);
  }

  const seen = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== "string") throw new Error(`รูปแบบรายการ${fieldLabel}ไม่ถูกต้อง`);
    const clean = cleanChoiceText(item);
    if (!clean) continue;
    if (clean.length > NURSE_CHOICE_LABEL_MAX_LENGTH) throw new Error(`${fieldLabel}ยาวเกินไป`);
    if (!seen.has(choiceMatchKey(clean))) seen.set(choiceMatchKey(clean), clean);
  }
  return [...seen.values()];
}

/** เทียบข้อความที่นักเรียนส่งมากับรายการตัวเลือก คืนข้อความมาตรฐานของตัวเลือก หรือ null ถ้าไม่มี */
export function findChoiceOption(options: string[], value: unknown) {
  if (typeof value !== "string") return null;
  const key = choiceMatchKey(value);
  if (!key) return null;
  return options.find((option) => choiceMatchKey(option) === key) ?? null;
}

export interface NurseEvaluation {
  isGlandCorrect: boolean | null;
  isHormoneCorrect: boolean | null;
  score: number | null;
}

/**
 * ให้คะแนนคำตอบของพยาบาลเทียบกับเฉลยของโรคจริงที่ห้องบัตรกำหนด แบบได้ทั้งหมดหรือไม่ได้เลย:
 * ต้องถูกทั้งต่อมไร้ท่อและฮอร์โมนจึงได้ 1 คะแนน ถูกข้อเดียวหรือผิดทั้งคู่ได้ 0
 * ข้อที่โรคนั้นยังไม่มีเฉลยจะเป็น null และไม่นำมาตัดสิน (ถูกทุกข้อที่มีเฉลย = ได้ 1)
 * ถ้าไม่มีเฉลยทั้งสองข้อ คะแนนรวมเป็น null
 */
export function evaluateNurseChoice({
  answer,
  gland,
  hormone,
}: {
  answer: { gland: string | null; hormone: string | null };
  gland: string | null;
  hormone: string | null;
}): NurseEvaluation {
  const answerGland = choiceMatchKey(answer.gland);
  const answerHormone = choiceMatchKey(answer.hormone);

  const isGlandCorrect = answerGland ? choiceMatchKey(gland) === answerGland : null;
  const isHormoneCorrect = answerHormone ? choiceMatchKey(hormone) === answerHormone : null;

  if (isGlandCorrect === null && isHormoneCorrect === null) {
    return { isGlandCorrect, isHormoneCorrect, score: null };
  }

  return {
    isGlandCorrect,
    isHormoneCorrect,
    score: isGlandCorrect !== false && isHormoneCorrect !== false ? NURSE_MAX_SCORE : 0,
  };
}

/**
 * ตรวจข้อความเฉลยที่ครูกรอกจากหน้าจัดการข้อมูลโรค เว้นว่างได้ (แปลว่าโรคนี้ยังไม่มีเฉลยข้อนั้น)
 * โยน Error เป็นข้อความภาษาไทยเพื่อส่งกลับไปแสดงให้ผู้ใช้
 */
export function normalizeNurseChoiceInput(value: unknown, fieldLabel: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`รูปแบบ${fieldLabel}ไม่ถูกต้อง`);

  const clean = cleanChoiceText(value);
  if (!clean) return null;
  if (clean.length > NURSE_CHOICE_LABEL_MAX_LENGTH) throw new Error(`${fieldLabel}ยาวเกินไป`);
  return clean;
}
