"use client";

import { useMemo, useState } from "react";
import { Download, X, CheckSquare, Square, Scissors, RefreshCw } from "lucide-react";
import type { DiseaseLabResult } from "@/lib/disease-lab-results";

export interface PrintableDisease {
  id: string;
  code: string;
  name: string;
  symptoms: string;
  labResults?: DiseaseLabResult[] | null;
}

// A4 = 210 × 297 mm; หักขอบกระดาษ 10 mm เหลือพื้นที่พิมพ์ 190 × 277 mm
// fontSize ของแต่ละแบบเลือกจากการวัดจริง ให้บัตรที่อาการยาวที่สุดเกือบเต็มช่องพอดี
const CARD_GAP_MM = 4;
const PAGE_MARGIN_MM = 10;
const PAGE_CONTENT_WIDTH_MM = 210 - PAGE_MARGIN_MM * 2;
const PAGE_CONTENT_MM = 297 - PAGE_MARGIN_MM * 2;
const MM_TO_PX = 96 / 25.4;
const MAX_CANVAS_PX = 30000; // เพดานความสูง canvas ของเบราว์เซอร์
const JPEG_QUALITY = 0.92;
const LAYOUTS = {
  2: { label: "2 ใบ/แผ่น", columns: 1, heightMm: 134, fontSize: 22, codeSize: 42 },
  4: { label: "4 ใบ/แผ่น", columns: 2, heightMm: 134, fontSize: 16, codeSize: 32 },
  6: { label: "6 ใบ/แผ่น", columns: 2, heightMm: 88, fontSize: 12, codeSize: 24 },
  8: { label: "8 ใบ/แผ่น", columns: 2, heightMm: 65, fontSize: 10, codeSize: 20 },
} as const;

type PerPage = keyof typeof LAYOUTS;

export function DiseasePrintModal({
  diseases,
  onClose,
}: {
  diseases: PrintableDisease[];
  onClose: () => void;
}) {
  const [perPage, setPerPage] = useState<PerPage>(4);
  const [showName, setShowName] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [fitContent, setFitContent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => diseases.map((d) => d.id));

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedDiseases = useMemo(
    () => diseases.filter((d) => selectedSet.has(d.id)),
    [diseases, selectedSet]
  );

  const layout = LAYOUTS[perPage];
  const sheetCount = Math.max(1, Math.ceil(selectedDiseases.length / perPage));

  const toggleDisease = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // สร้าง PDF ขนาด A4 จากตัวอย่างบนหน้าจอ แล้วดาวน์โหลดลงเครื่อง
  const handleDownloadPdf = async () => {
    if (selectedDiseases.length === 0 || exporting) return;

    const grid = document.getElementById("disease-cards-grid");
    if (!grid) return;

    try {
      setExporting(true);
      setExportError(null);

      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);

      // 3x ≈ 288 dpi สำหรับงานพิมพ์ ลดอัตราลงถ้ารายการยาวมากจนเกินขนาด canvas ที่เบราว์เซอร์รองรับ
      const SCALE = Math.min(3, Math.max(1, MAX_CANVAS_PX / Math.max(grid.scrollHeight, 1)));
      const canvas = await html2canvas(grid, {
        scale: SCALE,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // หาขอบล่างของแต่ละแถวไว้ตัดหน้า เพื่อไม่ให้บัตรถูกผ่ากลาง
      const gridTop = grid.getBoundingClientRect().top;
      const cards = Array.from(
        grid.querySelectorAll<HTMLElement>(".disease-print-card")
      );
      const rowBottoms: number[] = [];
      for (let i = 0; i < cards.length; i += layout.columns) {
        const row = cards.slice(i, i + layout.columns);
        const bottom = Math.max(
          ...row.map((card) => card.getBoundingClientRect().bottom - gridTop)
        );
        rowBottoms.push(bottom + (i + layout.columns < cards.length ? CARD_GAP_MM * MM_TO_PX : 0));
      }

      const pageContentPx = PAGE_CONTENT_MM * MM_TO_PX;
      const cuts: Array<{ start: number; end: number }> = [];
      let start = 0;
      for (let i = 0; i < rowBottoms.length; i++) {
        const isLast = i === rowBottoms.length - 1;
        const nextBottom = rowBottoms[i];
        if (nextBottom - start > pageContentPx && i > 0) {
          cuts.push({ start, end: rowBottoms[i - 1] });
          start = rowBottoms[i - 1];
        }
        if (isLast) cuts.push({ start, end: nextBottom });
      }

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const slice = document.createElement("canvas");
      const context = slice.getContext("2d");
      if (!context) throw new Error("เบราว์เซอร์นี้สร้างไฟล์ PDF ไม่ได้");

      cuts.forEach((cut, index) => {
        const sourceY = Math.round(cut.start * SCALE);
        const sourceHeight = Math.min(
          Math.round((cut.end - cut.start) * SCALE),
          canvas.height - sourceY
        );
        if (sourceHeight <= 0) return;

        slice.width = canvas.width;
        slice.height = sourceHeight;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const heightMm = Math.min(sourceHeight / SCALE / MM_TO_PX, PAGE_CONTENT_MM);
        if (index > 0) pdf.addPage();
        pdf.addImage(
          slice.toDataURL("image/jpeg", JPEG_QUALITY),
          "JPEG",
          PAGE_MARGIN_MM,
          PAGE_MARGIN_MM,
          PAGE_CONTENT_WIDTH_MM,
          heightMm
        );
      });

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`บัตรโรค-${selectedDiseases.length}ใบ-${today}.pdf`);
    } catch (error) {
      console.error("Failed to export disease cards PDF:", error);
      setExportError(
        error instanceof Error ? error.message : "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="disease-print-host w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ส่งออกบัตรโรคเป็น PDF</h3>
              <p className="text-xs text-slate-500">
                ไฟล์ PDF ขนาด A4 ดาวน์โหลดลงเครื่อง • วางหลายใบต่อแผ่นแล้วตัดตามเส้นประ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ตัวเลือกการพิมพ์ */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">จำนวนต่อแผ่น</span>
            <div className="flex items-center gap-1">
              {(Object.keys(LAYOUTS) as unknown as PerPage[]).map((value) => {
                const option = Number(value) as PerPage;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPerPage(option)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      perPage === option
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {LAYOUTS[option].label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
            />
            <span>แสดงชื่อโรค (เฉลย)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showLab}
              onChange={(e) => setShowLab(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
            />
            <span>แสดงผลตรวจทางห้องปฏิบัติการ</span>
          </label>

          <label
            className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
            title="ตัดพื้นที่ว่างท้ายบัตรออก ความสูงจะเท่ากับเนื้อหาจริงของแต่ละใบ"
          >
            <input
              type="checkbox"
              checked={fitContent}
              onChange={(e) => setFitContent(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
            />
            <span>ย่อความสูงให้พอดีเนื้อหา</span>
          </label>
        </div>

        {/* เลือกโรคที่จะพิมพ์ */}
        <div className="mt-3 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-700">
              เลือกโรคที่จะพิมพ์ ({selectedDiseases.length}/{diseases.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedIds(diseases.map((d) => d.id))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                ล้างทั้งหมด
              </button>
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {diseases.map((disease) => (
                <label
                  key={disease.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(disease.id)}
                    onChange={() => toggleDisease(disease.id)}
                    className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-rose-700">{disease.code}</span>
                  <span className="truncate">{disease.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ตัวอย่างก่อนพิมพ์ (ขนาดจริง A4) */}
        <p className="mt-4 text-[11px] text-slate-500">
          ตัวอย่างขนาดจริง A4 — รวม {selectedDiseases.length} ใบ ประมาณ {sheetCount} แผ่น
          {fitContent
            ? " (ความสูงพอดีเนื้อหา บางแผ่นอาจวางได้มากกว่านี้)"
            : " (บัตรสูงเท่ากันทุกใบ ตัดเป็นตารางได้)"}
        </p>
        <div className="mt-2 overflow-x-auto rounded-2xl bg-slate-100 p-4">
          <div
            id="printable-disease-cards"
            className="mx-auto"
            style={{
              width: "210mm",
              padding: `${PAGE_MARGIN_MM}mm`,
              boxSizing: "border-box",
              background: "#ffffff",
            }}
          >
            {selectedDiseases.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                ยังไม่ได้เลือกโรคที่จะพิมพ์
              </p>
            ) : (
              <div
                id="disease-cards-grid"
                style={{
                  display: "grid",
                  background: "#ffffff",
                  gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
                  gap: `${CARD_GAP_MM}mm`,
                  alignItems: fitContent ? "start" : "stretch",
                }}
              >
                {selectedDiseases.map((disease) => {
                  const labs = Array.isArray(disease.labResults) ? disease.labResults : [];
                  return (
                    <article
                      key={disease.id}
                      className="disease-print-card"
                      style={{
                        minHeight: fitContent ? undefined : `${layout.heightMm}mm`,
                        border: "1px dashed #94a3b8",
                        borderRadius: "3mm",
                        padding: "5mm",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2.5mm",
                        color: "#0f172a",
                        fontSize: `${layout.fontSize}px`,
                        lineHeight: 1.65,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #e2e8f0",
                          paddingBottom: "2mm",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: `${layout.fontSize - 1}px`, color: "#64748b" }}>
                            รหัสโรค
                          </div>
                          <div
                            style={{
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                              fontSize: `${layout.codeSize}px`,
                              fontWeight: 700,
                              letterSpacing: "0.05em",
                              lineHeight: 1.15,
                            }}
                          >
                            {disease.code}
                          </div>
                        </div>
                        <div style={{ fontSize: `${layout.fontSize - 1}px`, color: "#64748b" }}>
                          บัตรผู้ป่วย
                        </div>
                      </div>

                      {showName && (
                        <div style={{ fontWeight: 700 }}>{disease.name}</div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: `${layout.fontSize - 1}px`,
                            color: "#64748b",
                            marginBottom: "1mm",
                          }}
                        >
                          อาการ
                        </div>
                        <p style={{ margin: 0, textIndent: "8mm" }}>{disease.symptoms}</p>
                      </div>

                      {showLab && labs.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: `${layout.fontSize - 1}px`,
                              color: "#64748b",
                              marginBottom: "1mm",
                            }}
                          >
                            ผลตรวจทางห้องปฏิบัติการ
                          </div>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: `${layout.fontSize - 1}px`,
                            }}
                          >
                            <tbody>
                              {labs.map((row, index) => (
                                <tr key={index}>
                                  <td style={{ padding: "0.5mm 0", verticalAlign: "top" }}>
                                    {row.name}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5mm 0 0.5mm 2mm",
                                      verticalAlign: "top",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {row.result}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5mm 0 0.5mm 2mm",
                                      verticalAlign: "top",
                                      color: "#64748b",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {row.referenceRange || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {exportError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {exportError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <Scissors className="h-3.5 w-3.5" />
            ตัดตามเส้นประของแต่ละใบ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={selectedDiseases.length === 0 || exporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>ดาวน์โหลด PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
