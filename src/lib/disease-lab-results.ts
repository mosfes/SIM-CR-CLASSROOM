export interface DiseaseLabResult {
  name: string;
  result: string;
  referenceRange: string;
}

export const LAB_RESULT_MAX_ROWS = 30;
export const LAB_RESULT_FIELD_MAX_LENGTH = 191;

/**
 * Validates the lab-result rows sent from the admin form. Rows that are
 * entirely blank are dropped so an empty spare row in the UI is not an error.
 * Throws with a Thai message intended for the client when a row is invalid.
 */
export function normalizeLabResultsInput(value: unknown): DiseaseLabResult[] {
  if (value === null || value === undefined) return [];

  if (!Array.isArray(value)) {
    throw new Error("รูปแบบผลตรวจทางห้องปฏิบัติการไม่ถูกต้อง");
  }

  if (value.length > LAB_RESULT_MAX_ROWS) {
    throw new Error(`ผลตรวจทางห้องปฏิบัติการมีได้ไม่เกิน ${LAB_RESULT_MAX_ROWS} รายการ`);
  }

  const rows: DiseaseLabResult[] = [];

  for (let i = 0; i < value.length; i++) {
    const row = value[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`ข้อมูลผลตรวจรายการที่ ${i + 1} ไม่ถูกต้อง`);
    }

    const { name, result, referenceRange } = row as Record<string, unknown>;

    for (const [field, label] of [
      [name, "ชื่อรายการตรวจ"],
      [result, "ผลตรวจ"],
      [referenceRange, "ค่าอ้างอิง"],
    ] as const) {
      if (field !== undefined && field !== null && typeof field !== "string") {
        throw new Error(`${label}ของรายการที่ ${i + 1} ไม่ถูกต้อง`);
      }
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanResult = typeof result === "string" ? result.trim() : "";
    const cleanReference = typeof referenceRange === "string" ? referenceRange.trim() : "";

    // Skip spare blank rows from the form.
    if (!cleanName && !cleanResult && !cleanReference) continue;

    if (!cleanName) {
      throw new Error(`กรุณากรอกชื่อรายการตรวจสำหรับผลตรวจรายการที่ ${i + 1}`);
    }
    if (!cleanResult) {
      throw new Error(`กรุณากรอกผลตรวจสำหรับรายการที่ ${i + 1}`);
    }

    if (
      cleanName.length > LAB_RESULT_FIELD_MAX_LENGTH ||
      cleanResult.length > LAB_RESULT_FIELD_MAX_LENGTH ||
      cleanReference.length > LAB_RESULT_FIELD_MAX_LENGTH
    ) {
      throw new Error(`ข้อมูลผลตรวจรายการที่ ${i + 1} ยาวเกินไป`);
    }

    rows.push({ name: cleanName, result: cleanResult, referenceRange: cleanReference });
  }

  return rows;
}

/**
 * Reads the `Disease.labResults` JSON column back into a typed array,
 * tolerating rows written before this shape existed.
 */
export function parseLabResults(value: unknown): DiseaseLabResult[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const { name, result, referenceRange } = row as Record<string, unknown>;
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanResult = typeof result === "string" ? result.trim() : "";
    if (!cleanName && !cleanResult) return [];
    return [
      {
        name: cleanName,
        result: cleanResult,
        referenceRange: typeof referenceRange === "string" ? referenceRange.trim() : "",
      },
    ];
  });
}
