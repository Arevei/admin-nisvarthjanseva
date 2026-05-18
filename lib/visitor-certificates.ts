import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { VisitorCertificateDoc, VisitorCertificateTemplate } from "@/lib/types";

export const visitorCertificateTemplates: Array<{
  id: VisitorCertificateTemplate;
  name: string;
  primary: [number, number, number];
  accent: [number, number, number];
  background: [number, number, number];
}> = [
  { id: "classic", name: "Classic Red", primary: [190, 0, 39], accent: [35, 35, 35], background: [255, 252, 248] },
  { id: "heritage", name: "Heritage Gold", primary: [146, 97, 16], accent: [84, 55, 20], background: [255, 250, 235] },
  { id: "service", name: "Service Green", primary: [22, 101, 52], accent: [20, 83, 45], background: [247, 253, 247] },
  { id: "impact", name: "Impact Blue", primary: [29, 78, 216], accent: [30, 64, 175], background: [248, 251, 255] },
  { id: "appreciation", name: "Appreciation Plum", primary: [126, 34, 206], accent: [88, 28, 135], background: [253, 247, 255] },
  { id: "modern", name: "Modern Slate", primary: [51, 65, 85], accent: [15, 23, 42], background: [248, 250, 252] },
];

export function generateVisitorCertificateNumber() {
  return `VIS-NSF-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
}

export function getVisitorTemplate(templateId: string | undefined) {
  return visitorCertificateTemplates.find((template) => template.id === templateId) ?? visitorCertificateTemplates[0];
}

export function getVerificationBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(requestUrl).origin;
}

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "visitor-certificate";
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getPngDimensions(buffer: Buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getLogo() {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-stacked.png");
  const logoBuffer = readFileSync(logoPath);

  return {
    dataUrl: `data:image/png;base64,${logoBuffer.toString("base64")}`,
    ...getPngDimensions(logoBuffer),
  };
}

function addCenteredFitText(
  doc: jsPDF,
  text: string,
  y: number,
  size: number,
  minSize: number,
  maxWidth: number,
  color: [number, number, number],
) {
  let fontSize = size;
  doc.setFontSize(fontSize);

  while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }

  doc.setTextColor(...color);
  doc.text(text, 148.5, y, { align: "center", maxWidth });
}

export async function generateVisitorCertificatePdf(certificate: VisitorCertificateDoc, requestUrl: string) {
  const template = getVisitorTemplate(certificate.templateId);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const verificationUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(certificate.certificateNumber)}&documentType=visitor-certificate`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.setFillColor(...template.background);
  doc.rect(0, 0, 297, 210, "F");

  doc.setDrawColor(...template.primary);
  doc.setLineWidth(1.3);
  doc.rect(12, 12, 273, 186);
  doc.setLineWidth(0.35);
  doc.rect(18, 18, 261, 174);
  doc.setLineWidth(0.25);
  doc.line(30, 31, 118, 31);
  doc.line(179, 31, 267, 31);

  const logo = getLogo();
  const logoHeight = 26;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", (297 - logoWidth) / 2, 20, logoWidth, logoHeight);

  doc.addImage(qrDataUrl, "PNG", 244, 26, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...template.primary);
  doc.text("SCAN TO VERIFY", 256, 55, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...template.primary);
  doc.text(certificate.title.toUpperCase(), 148.5, 68, { align: "center" });

  doc.setDrawColor(...template.primary);
  doc.line(88, 76, 209, 76);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(75, 75, 75);
  doc.text("This certificate is proudly presented to", 148.5, 92, { align: "center" });

  doc.setFont("times", "bolditalic");
  addCenteredFitText(doc, certificate.recipientName.toUpperCase(), 111, 31, 18, 215, template.accent);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(75, 75, 75);
  const descriptionLines = doc.splitTextToSize(certificate.description, 190).slice(0, 3);
  doc.text(descriptionLines, 148.5, 127, { align: "center" });

  if (certificate.eventName) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...template.primary);
    doc.text(certificate.eventName, 148.5, 150, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...template.primary);
  doc.text("Certificate No.", 34, 170);
  doc.text("Issued On", 34, 182);
  doc.text("Issued By", 178, 170);

  doc.setTextColor(35, 35, 35);
  doc.text(certificate.certificateNumber, 78, 170);
  doc.text(formatDate(certificate.issuedAt), 78, 182);
  doc.text(certificate.issuedBy || "Nisvarthjan Seva Foundation", 207, 170, { maxWidth: 58 });

  doc.setDrawColor(...template.accent);
  doc.setLineWidth(0.3);
  doc.line(205, 184, 262, 184);
  doc.setTextColor(...template.primary);
  doc.text("Authorized Signature", 233.5, 190, { align: "center" });

  return doc.output("arraybuffer");
}
