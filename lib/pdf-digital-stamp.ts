import type { jsPDF } from "jspdf";

export function drawDigitalStamp(
  doc: jsPDF,
  x: number,
  y: number,
  color: [number, number, number] = [190, 0, 39],
) {
  const width = 36;
  const height = 20;
  const left = x - width / 2;
  const top = y - height / 2;

  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.roundedRect(left, top, width, height, 1.5, 1.5, "S");
  doc.setLineWidth(0.2);
  doc.roundedRect(left + 1.2, top + 1.2, width - 2.4, height - 2.4, 1, 1, "S");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);

  doc.setFontSize(4.8);
  doc.text("NISVARTHJAN SEVA", x, top + 5.2, { align: "center" });
  doc.text("FOUNDATION", x, top + 8.4, { align: "center" });

  doc.setLineWidth(0.15);
  doc.line(left + 4, top + 10.5, left + width - 4, top + 10.5);

  doc.setFontSize(6.2);
  doc.text("DIGITALLY", x, top + 14.2, { align: "center" });
  doc.text("SIGNED", x, top + 17.2, { align: "center" });
}
