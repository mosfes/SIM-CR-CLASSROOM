// สร้างไฟล์ PDF ขนาด A4 จากส่วนของหน้าจอ แล้วดาวน์โหลดลงเครื่อง
// ใช้ร่วมกันระหว่างโมดัลเวชระเบียน (monitor) และโมดัลกิจกรรมนักเรียน

const PAGE_MARGIN_MM = 15; // ขอบกระดาษ A4 ให้เนื้อหาไม่ชนขอบเวลาพิมพ์จริง
const PAGE_WIDTH_MM = 210 - PAGE_MARGIN_MM * 2;
const PAGE_HEIGHT_MM = 297 - PAGE_MARGIN_MM * 2;
const MAX_CANVAS_PX = 30000; // เพดานความสูง canvas ของเบราว์เซอร์
const JPEG_QUALITY = 0.94;
const MIN_WIDTH_PX = 640; // กันกรณีจอแคบมาก ไม่ให้เนื้อหาถูกบีบจนอ่านไม่ออกในไฟล์ A4
// เนื้อหาที่ยาวเกินหน้าเดียวไม่เกินเท่านี้ จะย่อให้จบในแผ่นเดียวแทนการตัดหน้า
// (1.3 ≈ ย่อเหลือ 77% ยังอ่านออกสบาย ถ้ามากกว่านี้ตัวหนังสือจะเล็กเกินไป)
const FIT_SINGLE_PAGE_RATIO = 1.3;

/** ลบอักขระที่ใช้ตั้งชื่อไฟล์ไม่ได้ออก */
export function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

/** คลายกล่องที่ตั้ง max-height / overflow ไว้ เพื่อให้เนื้อหาถูกจับภาพครบทั้งหมด */
function unclip(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    const style = window.getComputedStyle(el);
    if (style.maxHeight !== "none") el.style.maxHeight = "none";
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      el.style.overflowY = "visible";
      el.style.height = "auto";
    }
    if (style.overflowX === "auto" || style.overflowX === "scroll") {
      el.style.overflowX = "visible";
    }
  }
}

/**
 * จับภาพ element (โคลนไว้นอกจอ เพื่อไม่ให้หน้าจอกระพริบ) แล้วบันทึกเป็น PDF A4 หลายหน้า
 * - element ที่มี data-pdf-ignore จะไม่ถูกใส่ลงไฟล์ (เช่น ปุ่มท้ายโมดัล)
 * - ตัดหน้าโดยเลี่ยงการผ่ากลาง element ที่มี data-pdf-block
 */
export async function downloadElementAsPdf(element: HTMLElement, fileName: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  const width = Math.max(Math.round(element.getBoundingClientRect().width), MIN_WIDTH_PX);
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;top:0;left:-100000px;z-index:-1;background:#ffffff;width:${width}px;`;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.width = `${width}px`;
  clone.style.margin = "0";
  clone.style.boxShadow = "none";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    clone.querySelectorAll("[data-pdf-ignore]").forEach((node) => node.remove());
    unclip(clone);

    const height = Math.max(clone.scrollHeight, 1);
    const scale = Math.min(2.5, Math.max(1, MAX_CANVAS_PX / height));
    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor: "#ffffff",
      logging: false,
      windowHeight: height + 200,
    });

    // ยึดความสูงที่จับภาพได้จริงเป็นหลัก ไม่ใช่ scrollHeight ของ DOM ซึ่งมักเกินมาไม่กี่ px
    // (ถ้าอิง DOM เอกสารที่พอดีแผ่นเดียวจะถูกตัดขึ้นหน้าสองโดยไม่จำเป็น)
    const renderedHeight = canvas.height / scale;

    // ตำแหน่งที่ตัดหน้าได้โดยไม่ผ่ากลางการ์ด
    const cloneTop = clone.getBoundingClientRect().top;
    const stops = Array.from(clone.querySelectorAll<HTMLElement>("[data-pdf-block]"))
      .map((node) => node.getBoundingClientRect().bottom - cloneTop)
      .filter((bottom) => bottom > 0 && bottom < renderedHeight)
      .sort((a, b) => a - b);

    // ความสูง 1 หน้า เทียบเป็น px ของ element (ภาพกว้าง width px ถูกย่อลงเหลือ PAGE_WIDTH_MM)
    const pagePx = (PAGE_HEIGHT_MM / PAGE_WIDTH_MM) * width;
    const cuts: Array<{ start: number; end: number }> = [];
    if (renderedHeight <= pagePx * FIT_SINGLE_PAGE_RATIO) {
      // จบในแผ่นเดียว (ถ้าเกินหน้าเล็กน้อยจะถูกย่อลงตอนวางภาพ)
      cuts.push({ start: 0, end: renderedHeight });
    } else {
      let start = 0;
      while (start < renderedHeight - 1) {
        const limit = start + pagePx;
        if (limit >= renderedHeight) {
          cuts.push({ start, end: renderedHeight });
          break;
        }
        const stop = [...stops]
          .reverse()
          .find((value) => value > start + pagePx * 0.2 && value <= limit);
        cuts.push({ start, end: stop ?? limit });
        start = stop ?? limit;
      }
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const slice = document.createElement("canvas");
    const context = slice.getContext("2d");
    if (!context) throw new Error("เบราว์เซอร์นี้สร้างไฟล์ PDF ไม่ได้");

    cuts.forEach((cut, index) => {
      const sourceY = Math.round(cut.start * scale);
      const sourceHeight = Math.min(
        Math.round((cut.end - cut.start) * scale),
        canvas.height - sourceY
      );
      if (sourceHeight <= 0) return;

      slice.width = canvas.width;
      slice.height = sourceHeight;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

      // ปกติวางเต็มความกว้างพื้นที่พิมพ์ ถ้าสูงเกินหน้า (กรณีย่อให้จบแผ่นเดียว)
      // ให้ย่อตามความสูงแทน แล้วจัดกึ่งกลางหน้ากระดาษ
      const naturalHeightMm = (PAGE_WIDTH_MM * sourceHeight) / canvas.width;
      const heightMm = Math.min(naturalHeightMm, PAGE_HEIGHT_MM);
      const widthMm = (PAGE_WIDTH_MM * heightMm) / naturalHeightMm;
      if (index > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL("image/jpeg", JPEG_QUALITY),
        "JPEG",
        (210 - widthMm) / 2,
        PAGE_MARGIN_MM,
        widthMm,
        heightMm
      );
    });

    pdf.save(safeFileName(fileName));
  } finally {
    host.remove();
  }
}
