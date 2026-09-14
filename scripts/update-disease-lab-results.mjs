import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ผลตรวจทางห้องปฏิบัติการของแต่ละกรณีศึกษา
// ที่มา: เอกสาร "โจทย์การวิเคราะห์โรค + ผลปฏิบัติการเทคนิคการแพทย์" (กรณีที่ 1–21)
const labResultsByCode = {
  // กรณีที่ 1 — Hypocalcemia
  "001": [
    { name: "Total calcium", result: "7.0 mg/dL ↓", referenceRange: "8.5–10.5" },
    { name: "Ionized Ca²⁺", result: "0.88 mmol/L ↓", referenceRange: "1.12–1.32" },
    { name: "Phosphate", result: "5.3 mg/dL ↑", referenceRange: "2.5–4.5" },
    { name: "Magnesium", result: "1.9 mg/dL", referenceRange: "1.7–2.2" },
    { name: "Glucose", result: "91 mg/dL", referenceRange: "70–99" },
    { name: "ECG", result: "QT interval ยาวขึ้น", referenceRange: "" },
  ],
  // กรณีที่ 2 — Hypercalcemia
  "002": [
    { name: "Total calcium", result: "12.3 mg/dL ↑", referenceRange: "8.5–10.5" },
    { name: "Ionized Ca²⁺", result: "1.55 mmol/L ↑", referenceRange: "1.12–1.32" },
    { name: "Phosphate", result: "2.2 mg/dL ↓", referenceRange: "2.5–4.5" },
    { name: "Creatinine", result: "1.0 mg/dL", referenceRange: "0.7–1.3" },
    { name: "Urine calcium", result: "สูง ↑", referenceRange: "" },
    { name: "ECG", result: "QT interval สั้นลง", referenceRange: "" },
  ],
  // กรณีที่ 3 — Osteoporosis
  "003": [
    { name: "Serum Ca²⁺", result: "9.1 mg/dL", referenceRange: "8.5–10.5" },
    { name: "Phosphate", result: "3.5 mg/dL", referenceRange: "2.5–4.5" },
    { name: "ALP", result: "89 U/L", referenceRange: "44–147" },
    { name: "25-OH Vitamin D", result: "18 ng/mL ↓", referenceRange: "โดยทั่วไป ≥30" },
    { name: "DEXA lumbar spine", result: "T-score = –2.9", referenceRange: "≥ –1 ปกติ" },
    { name: "X-ray", result: "กระดูกสันหลังยุบตัวบางตำแหน่ง", referenceRange: "" },
  ],
  // กรณีที่ 4 — Hyperthyroidism
  "004": [
    { name: "TSH", result: "0.01 mIU/L ↓", referenceRange: "0.4–4.0" },
    { name: "Free T4", result: "2.8 ng/dL ↑", referenceRange: "0.8–1.8" },
    { name: "Free T3", result: "6.2 pg/mL ↑", referenceRange: "2.3–4.2" },
    { name: "Fasting glucose", result: "96 mg/dL", referenceRange: "70–99" },
    { name: "Heart rate", result: "116/min ↑", referenceRange: "60–100" },
  ],
  // กรณีที่ 5 — Hypothyroidism
  "005": [
    { name: "TSH", result: "14.8 mIU/L ↑", referenceRange: "0.4–4.0" },
    { name: "Free T4", result: "0.45 ng/dL ↓", referenceRange: "0.8–1.8" },
    { name: "Free T3", result: "1.7 pg/mL ↓", referenceRange: "2.3–4.2" },
    { name: "Total cholesterol", result: "245 mg/dL ↑", referenceRange: "<200" },
    { name: "Na⁺", result: "136 mmol/L", referenceRange: "135–145" },
  ],
  // กรณีที่ 6 — Hyperparathyroidism
  "006": [
    { name: "PTH", result: "126 pg/mL ↑", referenceRange: "15–65" },
    { name: "Ca²⁺", result: "11.9 mg/dL ↑", referenceRange: "8.5–10.5" },
    { name: "Phosphate", result: "2.0 mg/dL ↓", referenceRange: "2.5–4.5" },
    { name: "ALP", result: "170 U/L ↑", referenceRange: "44–147" },
    { name: "Urine calcium", result: "สูง ↑", referenceRange: "" },
    { name: "DEXA", result: "Bone density ลดลง", referenceRange: "" },
  ],
  // กรณีที่ 7 — Hypoparathyroidism
  "007": [
    { name: "PTH", result: "6 pg/mL ↓", referenceRange: "15–65" },
    { name: "Ca²⁺", result: "6.9 mg/dL ↓", referenceRange: "8.5–10.5" },
    { name: "Phosphate", result: "5.9 mg/dL ↑", referenceRange: "2.5–4.5" },
    { name: "Mg²⁺", result: "1.9 mg/dL", referenceRange: "1.7–2.2" },
    { name: "ECG", result: "QT interval ยาว", referenceRange: "" },
  ],
  // กรณีที่ 8 — Hypoglycemia (ผลตรวจขณะมีอาการ)
  "008": [
    { name: "Plasma glucose (ขณะมีอาการ)", result: "46 mg/dL ↓", referenceRange: "70–99 fasting" },
    { name: "Na⁺", result: "139 mmol/L", referenceRange: "135–145" },
    { name: "K⁺", result: "4.1 mmol/L", referenceRange: "3.5–5.0" },
    { name: "Ca²⁺", result: "9.3 mg/dL", referenceRange: "8.5–10.5" },
    { name: "Plasma glucose (หลังรับ glucose)", result: "92 mg/dL", referenceRange: "" },
  ],
  // กรณีที่ 9 — Hyperglycemia
  "009": [
    { name: "Fasting plasma glucose", result: "176 mg/dL ↑", referenceRange: "70–99" },
    { name: "Random glucose", result: "228 mg/dL ↑", referenceRange: "" },
    { name: "HbA1c", result: "7.7% ↑", referenceRange: "<5.7" },
    { name: "Urine glucose", result: "Positive", referenceRange: "Negative" },
    { name: "Urine ketone", result: "Negative", referenceRange: "Negative" },
  ],
  // กรณีที่ 10 — Diabetes insipidus
  "010": [
    { name: "Serum Na⁺", result: "151 mmol/L ↑", referenceRange: "135–145" },
    { name: "Serum osmolality", result: "310 mOsm/kg ↑", referenceRange: "275–295" },
    { name: "Urine osmolality", result: "95 mOsm/kg ↓", referenceRange: "แปรตามภาวะน้ำ" },
    { name: "Urine specific gravity", result: "1.002 ↓", referenceRange: "~1.005–1.030" },
    { name: "Fasting glucose", result: "89 mg/dL", referenceRange: "70–99" },
    { name: "Urine glucose", result: "Negative", referenceRange: "Negative" },
  ],
  // กรณีที่ 11 — Diabetes mellitus
  "011": [
    { name: "Fasting plasma glucose", result: "184 mg/dL ↑", referenceRange: "70–99" },
    { name: "HbA1c", result: "8.3% ↑", referenceRange: "<5.7" },
    { name: "Random glucose", result: "256 mg/dL ↑", referenceRange: "" },
    { name: "Urine glucose", result: "Positive", referenceRange: "Negative" },
    { name: "Urine ketone", result: "Negative", referenceRange: "Negative" },
    { name: "Triglyceride", result: "220 mg/dL ↑", referenceRange: "<150" },
  ],
  // กรณีที่ 12 — Simmonds disease / Panhypopituitarism
  "012": [
    { name: "ACTH", result: "ต่ำ ↓", referenceRange: "" },
    { name: "Cortisol", result: "ต่ำ ↓", referenceRange: "" },
    { name: "TSH", result: "ต่ำ/ไม่สูงอย่างเหมาะสม", referenceRange: "" },
    { name: "Free T4", result: "ต่ำ ↓", referenceRange: "" },
    { name: "FSH/LH", result: "ต่ำ ↓", referenceRange: "" },
    { name: "IGF-1", result: "ต่ำ ↓", referenceRange: "" },
    { name: "Prolactin", result: "ต่ำ ↓", referenceRange: "" },
  ],
  // กรณีที่ 13 — Acromegaly
  "013": [
    { name: "IGF-1", result: "สูงมาก ↑", referenceRange: "" },
    { name: "GH หลัง oral glucose", result: "ไม่ถูกกดและยังสูง ↑", referenceRange: "" },
    { name: "Fasting glucose", result: "128 mg/dL ↑", referenceRange: "" },
    { name: "MRI pituitary", result: "พบก้อนบริเวณ anterior pituitary", referenceRange: "" },
    { name: "Growth plate", result: "ปิดแล้ว", referenceRange: "" },
  ],
  // กรณีที่ 14 — Dwarfism จาก GH deficiency
  "014": [
    { name: "IGF-1", result: "ต่ำ ↓", referenceRange: "" },
    { name: "GH stimulation test", result: "ตอบสนองต่ำ ↓", referenceRange: "" },
    { name: "TSH", result: "2.1 mIU/L", referenceRange: "" },
    { name: "Free T4", result: "1.2 ng/dL", referenceRange: "" },
    { name: "Bone age", result: "ช้ากว่าอายุจริง", referenceRange: "" },
  ],
  // กรณีที่ 15 — Gigantism
  "015": [
    { name: "GH", result: "สูงมาก ↑", referenceRange: "" },
    { name: "IGF-1", result: "สูงมาก ↑", referenceRange: "" },
    { name: "GH หลัง glucose", result: "ไม่ลดลง", referenceRange: "" },
    { name: "Growth plate", result: "ยังเปิดอยู่", referenceRange: "" },
    { name: "MRI pituitary", result: "พบ pituitary mass", referenceRange: "" },
  ],
  // กรณีที่ 16 — Cretinism / Congenital hypothyroidism ที่ไม่ได้รักษา
  "016": [
    { name: "TSH", result: ">50 mIU/L ↑↑", referenceRange: "" },
    { name: "Free T4", result: "0.3 ng/dL ↓↓", referenceRange: "" },
    { name: "Free T3", result: "ต่ำ ↓", referenceRange: "" },
    { name: "Bone age", result: "ล่าช้า", referenceRange: "" },
    { name: "Growth velocity", result: "ต่ำ", referenceRange: "" },
  ],
  // กรณีที่ 17 — Myxedema
  "017": [
    { name: "TSH", result: "22 mIU/L ↑", referenceRange: "" },
    { name: "Free T4", result: "0.32 ng/dL ↓", referenceRange: "" },
    { name: "Free T3", result: "ต่ำ ↓", referenceRange: "" },
    { name: "Cholesterol", result: "270 mg/dL ↑", referenceRange: "" },
    { name: "Na⁺", result: "132 mmol/L ↓", referenceRange: "" },
    { name: "Heart rate", result: "50/min ↓", referenceRange: "" },
  ],
  // กรณีที่ 18 — Cushing syndrome
  "018": [
    { name: "Serum cortisol", result: "สูง ↑", referenceRange: "" },
    { name: "24-h urinary free cortisol", result: "สูง ↑", referenceRange: "" },
    { name: "Fasting glucose", result: "158 mg/dL ↑", referenceRange: "" },
    { name: "K⁺", result: "3.3 mmol/L ↓", referenceRange: "" },
    { name: "Blood pressure", result: "162/98 mmHg ↑", referenceRange: "" },
    { name: "Bone density", result: "ลดลง", referenceRange: "" },
  ],
  // กรณีที่ 19 — Addison disease
  "019": [
    { name: "Morning cortisol", result: "ต่ำมาก ↓", referenceRange: "" },
    { name: "ACTH", result: "สูงมาก ↑", referenceRange: "" },
    { name: "Na⁺", result: "128 mmol/L ↓", referenceRange: "" },
    { name: "K⁺", result: "5.7 mmol/L ↑", referenceRange: "" },
    { name: "Glucose", result: "64 mg/dL ↓", referenceRange: "" },
    { name: "Blood pressure", result: "88/58 mmHg ↓", referenceRange: "" },
  ],
  // กรณีที่ 20 — Simple goiter
  "020": [
    { name: "Urinary iodine", result: "ต่ำ ↓", referenceRange: "" },
    { name: "TSH", result: "สูง ↑", referenceRange: "" },
    { name: "Free T4", result: "ต่ำ/ค่อนไปทางต่ำ", referenceRange: "" },
    { name: "Free T3", result: "ปกติค่อนไปทางต่ำ", referenceRange: "" },
    { name: "TSH-receptor Ab", result: "Negative", referenceRange: "" },
    { name: "Ultrasound", result: "ต่อมไทรอยด์โตแบบ diffuse", referenceRange: "" },
  ],
  // กรณีที่ 21 — Toxic goiter
  "021": [
    { name: "TSH", result: "<0.01 mIU/L ↓↓", referenceRange: "" },
    { name: "Free T4", result: "3.1 ng/dL ↑↑", referenceRange: "" },
    { name: "Free T3", result: "7.0 pg/mL ↑↑", referenceRange: "" },
    { name: "TSH-receptor antibody", result: "Positive", referenceRange: "" },
    { name: "Heart rate", result: "122/min ↑", referenceRange: "" },
    { name: "Radioactive iodine uptake", result: "เพิ่มขึ้นแบบ diffuse", referenceRange: "" },
  ],
};

async function main() {
  const codes = Object.keys(labResultsByCode);
  const existingDiseases = await prisma.disease.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });
  const existingCodes = new Set(existingDiseases.map(({ code }) => code));
  const missingCodes = codes.filter((code) => !existingCodes.has(code));

  if (missingCodes.length > 0) {
    throw new Error(`ไม่พบรหัสโรค: ${missingCodes.join(", ")}`);
  }

  const rowCount = codes.reduce((sum, code) => sum + labResultsByCode[code].length, 0);

  if (process.argv.includes("--dry-run")) {
    process.stdout.write(`ตรวจสอบผลตรวจแล้ว ${codes.length} โรค รวม ${rowCount} รายการ\n`);
    return;
  }

  await prisma.$transaction(
    codes.map((code) =>
      prisma.disease.update({
        where: { code },
        data: { labResults: labResultsByCode[code] },
      }),
    ),
  );

  process.stdout.write(`อัปเดตผลตรวจทางห้องปฏิบัติการแล้ว ${codes.length} โรค รวม ${rowCount} รายการ\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "อัปเดตผลตรวจทางห้องปฏิบัติการไม่สำเร็จ";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
