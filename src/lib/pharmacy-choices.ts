/**
 * ตัวเลือกของสถานีห้องยา (เภสัชกร)
 *
 * เฉลยจริงเก็บอยู่กับตัวโรคในฐานข้อมูล (`Disease.hormoneChoice*` / `Disease.treatmentChoice*`)
 * ครูแก้ไขได้จากหน้าจัดการข้อมูลโรค ไฟล์นี้เก็บเฉพาะชุดข้อมูลตั้งต้นตามใบงาน
 * "รหัสโรค / ตัวเลือกความผิดปกติของฮอร์โมน (A-U) / ตัวเลือกยา-การรักษา (ก-ธ)"
 * ไว้ใช้ seed ตอน migrate และใช้จัดลำดับตัวเลือกให้ตรงกับใบงานที่นักเรียนถืออยู่
 */

export interface PharmacyChoiceOption {
  /** ตัวอักษรที่นักเรียนเห็นบนใบงาน เช่น "A" หรือ "ก" */
  key: string;
  /** ข้อความของตัวเลือก */
  label: string;
}

export interface PharmacyChoiceSeedRow {
  diseaseCode: string;
  hormone: PharmacyChoiceOption;
  treatment: PharmacyChoiceOption;
}

/** ชุดข้อมูลตั้งต้นของทั้ง 21 กรณีศึกษา เรียงตามรหัสโรคเหมือนใบงาน */
export const PHARMACY_CHOICE_SEED: PharmacyChoiceSeedRow[] = [
  {
    diseaseCode: "001",
    hormone: { key: "A", label: "Ca²⁺ ↓" },
    treatment: {
      key: "ก",
      label: "Calcium gluconate, Calcium carbonate, Vitamin D / Calcitriol",
    },
  },
  {
    diseaseCode: "002",
    hormone: { key: "B", label: "Ca²⁺ ↑" },
    treatment: { key: "ข", label: "Saline, Calcitonin, Bisphosphonate" },
  },
  {
    diseaseCode: "003",
    hormone: { key: "C", label: "มวลกระดูก ↓" },
    treatment: {
      key: "ค",
      label:
        "Bisphosphonates เช่น Alendronate, Risedronate, Zoledronic acid; Denosumab, Teriparatide และเสริม Calcium + Vitamin D ตามข้อบ่งชี้",
    },
  },
  {
    diseaseCode: "004",
    hormone: { key: "D", label: "T₃/T₄ ↑" },
    treatment: {
      key: "ง",
      label:
        "Methimazole หรือ Propylthiouracil (PTU); อาจใช้ Beta-blocker เช่น Propranolol เพื่อควบคุมอาการ",
    },
  },
  {
    diseaseCode: "005",
    hormone: { key: "E", label: "T₃/T₄ ↓" },
    treatment: { key: "จ", label: "Levothyroxine" },
  },
  {
    diseaseCode: "006",
    hormone: { key: "F", label: "PTH ↑" },
    treatment: {
      key: "ฉ",
      label:
        "Cinacalcet; ใน secondary hyperparathyroidism อาจใช้ Calcitriol/Paricalcitol",
    },
  },
  {
    diseaseCode: "007",
    hormone: { key: "G", label: "PTH ↓" },
    treatment: { key: "ช", label: "Calcium + Calcitriol" },
  },
  {
    diseaseCode: "008",
    hormone: { key: "H", label: "Glucose ↓" },
    treatment: { key: "ซ", label: "Glucose/Dextrose; Glucagon" },
  },
  {
    diseaseCode: "009",
    hormone: { key: "I", label: "Glucose ↑" },
    treatment: { key: "ฌ", label: "Insulin/ยาลดน้ำตาลตามสาเหตุ" },
  },
  {
    diseaseCode: "010",
    hormone: { key: "J", label: "ADH/AVP ↓" },
    treatment: { key: "ญ", label: "Desmopressin" },
  },
  {
    diseaseCode: "011",
    hormone: { key: "K", label: "Insulin ↓ / ดื้อต่อ insulin" },
    treatment: { key: "ฎ", label: "Insulin/ยาลดน้ำตาล" },
  },
  {
    diseaseCode: "012",
    hormone: { key: "L", label: "Pituitary hormones ↓" },
    treatment: { key: "ฏ", label: "Hormone replacement" },
  },
  {
    diseaseCode: "013",
    hormone: { key: "M", label: "GH ↑ หลังโตเต็มวัย" },
    treatment: { key: "ฐ", label: "Octreotide/Lanreotide, Pegvisomant" },
  },
  {
    diseaseCode: "014",
    hormone: { key: "N", label: "GH ↓" },
    treatment: { key: "ฑ", label: "Somatropin" },
  },
  {
    diseaseCode: "015",
    hormone: { key: "O", label: "GH ↑ ก่อน epiphyseal closure" },
    treatment: {
      key: "ฒ",
      label:
        "Octreotide / Lanreotide, Pegvisomant, บางราย Cabergoline; การผ่าตัดเนื้องอกต่อมใต้สมองมักเป็นการรักษาหลัก",
    },
  },
  {
    diseaseCode: "016",
    hormone: { key: "P", label: "Thyroid hormone ↓ ในเด็ก" },
    treatment: {
      key: "ณ",
      label: "Levothyroxine (T4) และควรเริ่มรักษาเร็วหลังวินิจฉัย Cretinism",
    },
  },
  {
    diseaseCode: "017",
    hormone: { key: "Q", label: "Thyroid hormone ↓ รุนแรง" },
    treatment: {
      key: "ด",
      label:
        "Levothyroxine; ถ้าเป็น myxedema coma เป็นภาวะฉุกเฉิน ต้องรักษาในโรงพยาบาล",
    },
  },
  {
    diseaseCode: "018",
    hormone: { key: "R", label: "Cortisol ↑" },
    treatment: { key: "ต", label: "ยาลด cortisol + รักษาสาเหตุ" },
  },
  {
    diseaseCode: "019",
    hormone: { key: "S", label: "Cortisol/Aldosterone ↓" },
    treatment: { key: "ถ", label: "Hydrocortisone + Fludrocortisone" },
  },
  {
    diseaseCode: "020",
    hormone: { key: "T", label: "มักสัมพันธ์กับ iodine deficiency" },
    treatment: {
      key: "ท",
      label:
        "ถ้าเกิดจากขาดไอโอดีน → Iodine supplementation; บางกรณีใช้ Levothyroxine ตามข้อบ่งชี้",
    },
  },
  {
    diseaseCode: "021",
    hormone: { key: "U", label: "T₃/T₄ ↑" },
    treatment: {
      key: "ธ",
      label:
        "Methimazole หรือ PTU; Propranolol ช่วยลดใจสั่น/ชีพจรเร็ว และอาจรักษาด้วย radioactive iodine หรือผ่าตัดตามสาเหตุ",
    },
  },
];

/** คะแนนเต็มของสถานีห้องยา: ถูก 1 ข้อ = 2 คะแนน, ถูกทั้ง 2 ข้อ = 3 คะแนน */
export const PHARMACY_MAX_SCORE = 3;

export const PHARMACY_CHOICE_KEY_MAX_LENGTH = 8;
export const PHARMACY_HORMONE_LABEL_MAX_LENGTH = 191;
export const PHARMACY_TREATMENT_LABEL_MAX_LENGTH = 2000;

/** ลำดับตัวอักษรตามใบงาน ใช้เรียงตัวเลือกให้ตรงกับกระดาษที่นักเรียนถืออยู่ */
const HORMONE_KEY_ORDER = new Map(
  PHARMACY_CHOICE_SEED.map((row, index) => [row.hormone.key, index])
);
const TREATMENT_KEY_ORDER = new Map(
  PHARMACY_CHOICE_SEED.map((row, index) => [row.treatment.key, index])
);

function sortByKeyOrder(
  options: PharmacyChoiceOption[],
  order: Map<string, number>
) {
  return [...options].sort((a, b) => {
    const rankA = order.get(a.key);
    const rankB = order.get(b.key);
    // ตัวเลือกที่ครูเพิ่มเองนอกใบงาน ให้ไปต่อท้ายและเรียงตามตัวอักษรไทย/อังกฤษ
    if (rankA === undefined && rankB === undefined) return a.key.localeCompare(b.key, "th");
    if (rankA === undefined) return 1;
    if (rankB === undefined) return -1;
    return rankA - rankB;
  });
}

/** รวมตัวเลือกจากทุกโรคให้เป็นรายการเดียว ตัดตัวอักษรซ้ำและเรียงตามใบงาน */
export function buildPharmacyChoiceOptions(
  diseases: Array<{
    hormoneChoiceKey: string | null;
    hormoneChoiceLabel: string | null;
    treatmentChoiceKey: string | null;
    treatmentChoiceLabel: string | null;
  }>
) {
  const hormones = new Map<string, PharmacyChoiceOption>();
  const treatments = new Map<string, PharmacyChoiceOption>();

  for (const disease of diseases) {
    const hormoneKey = disease.hormoneChoiceKey?.trim();
    const hormoneLabel = disease.hormoneChoiceLabel?.trim();
    if (hormoneKey && hormoneLabel && !hormones.has(hormoneKey)) {
      hormones.set(hormoneKey, { key: hormoneKey, label: hormoneLabel });
    }

    const treatmentKey = disease.treatmentChoiceKey?.trim();
    const treatmentLabel = disease.treatmentChoiceLabel?.trim();
    if (treatmentKey && treatmentLabel && !treatments.has(treatmentKey)) {
      treatments.set(treatmentKey, { key: treatmentKey, label: treatmentLabel });
    }
  }

  return {
    hormones: sortByKeyOrder([...hormones.values()], HORMONE_KEY_ORDER),
    treatments: sortByKeyOrder([...treatments.values()], TREATMENT_KEY_ORDER),
  };
}

/** อ่านเฉลยของโรคหนึ่ง ๆ คืน null เมื่อครูยังไม่ได้กรอกตัวเลือกให้โรคนั้น */
export function readDiseaseAnswerKey(disease: {
  hormoneChoiceKey: string | null;
  hormoneChoiceLabel: string | null;
  treatmentChoiceKey: string | null;
  treatmentChoiceLabel: string | null;
} | null | undefined) {
  if (!disease) return null;

  const hormoneKey = disease.hormoneChoiceKey?.trim();
  const hormoneLabel = disease.hormoneChoiceLabel?.trim();
  const treatmentKey = disease.treatmentChoiceKey?.trim();
  const treatmentLabel = disease.treatmentChoiceLabel?.trim();

  if (!hormoneKey || !hormoneLabel || !treatmentKey || !treatmentLabel) return null;

  return {
    hormone: { key: hormoneKey, label: hormoneLabel },
    treatment: { key: treatmentKey, label: treatmentLabel },
  };
}

export interface PharmacyEvaluation {
  isHormoneCorrect: boolean | null;
  isTreatmentCorrect: boolean | null;
  isCorrect: boolean | null;
  score: number | null;
}

/**
 * ให้คะแนนตัวเลือกของเภสัชกรเทียบกับเฉลยของโรคจริงที่ห้องบัตรกำหนด
 * (ไม่ใช่โรคที่แพทย์วินิจฉัย) เภสัชกรจึงต้องวิเคราะห์เองว่าข้อมูลที่ส่งต่อกันมาถูกต้องหรือไม่
 *
 * ตัวเลือกบางคู่มีข้อความเหมือนกันทุกตัวอักษร (เช่น D และ U คือ "T₃/T₄ ↑")
 * จึงนับว่าถูกเมื่อข้อความของตัวเลือกตรงกับเฉลย ไม่ได้ยึดเฉพาะตัวอักษร
 */
export function evaluatePharmacyChoice({
  answer,
  hormone,
  treatment,
}: {
  answer: { hormone: PharmacyChoiceOption; treatment: PharmacyChoiceOption } | null;
  hormone: PharmacyChoiceOption;
  treatment: PharmacyChoiceOption;
}): PharmacyEvaluation {
  if (!answer) {
    return { isHormoneCorrect: null, isTreatmentCorrect: null, isCorrect: null, score: null };
  }

  const isHormoneCorrect = hormone.label === answer.hormone.label;
  const isTreatmentCorrect = treatment.label === answer.treatment.label;

  const correctCount = (isHormoneCorrect ? 1 : 0) + (isTreatmentCorrect ? 1 : 0);
  const score = correctCount === 2 ? 3 : correctCount === 1 ? 2 : 0;

  return {
    isHormoneCorrect,
    isTreatmentCorrect,
    isCorrect: isHormoneCorrect && isTreatmentCorrect,
    score,
  };
}

/**
 * ตรวจรูปแบบตัวเลือกที่ครูกรอกจากหน้าจัดการข้อมูลโรค
 * ทั้งตัวอักษรและข้อความต้องกรอกคู่กัน หรือเว้นว่างทั้งคู่ (แปลว่าโรคนี้ยังไม่มีเฉลย)
 * โยน Error ที่เป็นข้อความภาษาไทยสำหรับส่งกลับไปแสดงให้ผู้ใช้
 */
export function normalizePharmacyChoiceInput(
  rawKey: unknown,
  rawLabel: unknown,
  { fieldLabel, labelMaxLength }: { fieldLabel: string; labelMaxLength: number }
) {
  for (const value of [rawKey, rawLabel]) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      throw new Error(`รูปแบบ${fieldLabel}ไม่ถูกต้อง`);
    }
  }

  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  const label = typeof rawLabel === "string" ? rawLabel.trim() : "";

  if (!key && !label) return { key: null, label: null };

  if (!key) throw new Error(`กรุณากรอกตัวอักษรของ${fieldLabel}`);
  if (!label) throw new Error(`กรุณากรอกข้อความของ${fieldLabel}`);
  if (key.length > PHARMACY_CHOICE_KEY_MAX_LENGTH) {
    throw new Error(`ตัวอักษรของ${fieldLabel}ยาวเกินไป`);
  }
  if (label.length > labelMaxLength) {
    throw new Error(`ข้อความของ${fieldLabel}ยาวเกินไป`);
  }

  return { key, label };
}
