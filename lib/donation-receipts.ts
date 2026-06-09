import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DonationDoc } from "@/lib/types";
import { drawDigitalStamp } from "@/lib/pdf-digital-stamp";

export function getVerificationBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(requestUrl).origin;
}

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "donation-receipt";
}

function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function get80GDetails() {
  return {
    registrationNumber:
      process.env.DONATION_80G_REGISTRATION_NUMBER ||
      process.env.NGO_80G_REGISTRATION_NUMBER ||
      process.env.NEXT_PUBLIC_NGO_80G_REGISTRATION_NUMBER ||
      "Not configured",
    validity: process.env.DONATION_80G_VALIDITY || process.env.NGO_80G_VALIDITY || process.env.NEXT_PUBLIC_NGO_80G_VALIDITY || "As per Form 10AC",
    ngoPan: process.env.DONATION_ORGANIZATION_PAN || process.env.NGO_PAN || process.env.NEXT_PUBLIC_NGO_PAN || "Not configured",
    address:
      process.env.DONATION_REGISTERED_ADDRESS ||
      process.env.NGO_ADDRESS ||
      process.env.NEXT_PUBLIC_NGO_ADDRESS ||
      "Nisvarthjan Seva Foundation",
  };
}

const PURPOSE_LABELS = new Map([
  ["\u0936\u093f\u0915\u094d\u0937\u093e \u0938\u0939\u093e\u092f\u0924\u093e", "Education Support"],
  ["\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u0947\u0935\u093e", "Health Services"],
  [
    "\u0917\u0930\u0940\u092c \u090f\u0935\u0902 \u091c\u0930\u0942\u0930\u0924\u092e\u0902\u0926 \u0938\u0939\u093e\u092f\u0924\u093e",
    "Poor & Needy Support",
  ],
  ["\u092a\u0930\u094d\u092f\u093e\u0935\u0930\u0923 \u0905\u092d\u093f\u092f\u093e\u0928", "Environment Campaign"],
  ["\u0906\u092a\u0926\u093e \u0930\u093e\u0939\u0924 \u0915\u093e\u0930\u094d\u092f", "Disaster Relief"],
  ["\u0938\u093e\u092e\u093e\u0928\u094d\u092f \u0926\u093e\u0928", "General Donation"],
]);

function normalizeDonationPurpose(value: string) {
  const text = safeText(value).trim();
  const repairedText = Buffer.from(text, "latin1").toString("utf8");

  return PURPOSE_LABELS.get(text) || PURPOSE_LABELS.get(repairedText) || text;
}

function formatDate(value: Date | string | undefined) {
  if (!value) return "Not available";
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

function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number, width = 72) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(doc.splitTextToSize(value, width).slice(0, 2), x, y + 5);
}

export async function generateDonationReceiptPdf(donation: DonationDoc, requestUrl: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const paidAt = donation.payment?.paidAt || donation.createdAt;
  const paymentMode = donation.payment?.mode || "manual";
  const paymentReference = donation.payment?.paymentId || donation.payment?.orderId || donation.payment?.receipt || donation.receiptNumber;
  const taxExemption = get80GDetails();
  const verifyUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(donation.receiptNumber)}&documentType=donation-receipt`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  const cardTop = 36;
  const cardHeight = 245;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(190, 0, 39);
  doc.rect(0, 0, 210, 44, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, cardTop, 182, cardHeight, 3, 3, "F");
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, cardTop, 182, cardHeight, 3, 3);

  const logo = getLogo();
  const logoHeight = 18;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", 22, 10, logoWidth, logoHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("80G Donation Receipt", 188, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Generated for income tax deduction under Section 80G", 188, 26, { align: "right" });

  doc.setFillColor(255, 245, 247);
  doc.roundedRect(22, 54, 166, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(190, 0, 39);
  doc.text("RECEIPT NO.", 30, 55);
  doc.text("PAID ON", 96, 55);
  doc.text("STATUS", 150, 55);
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(donation.receiptNumber, 30, 62);
  doc.text(formatDate(paidAt), 96, 62);
  doc.text((donation.status || donation.payment?.status || "paid").toUpperCase(), 150, 62);

  doc.setFillColor(24, 24, 27);
  doc.roundedRect(22, 78, 76, 31, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(212, 212, 216);
  doc.text("AMOUNT RECEIVED", 30, 89);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`INR ${donation.amount.toLocaleString("en-IN")}`, 30, 101);

  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(106, 78, 82, 31, 2, 2);
  drawInfoRow(doc, "Purpose", normalizeDonationPurpose(donation.purpose), 114, 89, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(190, 0, 39);
  doc.text("Donor Details", 22, 125);
  doc.setDrawColor(244, 63, 94);
  doc.line(22, 129, 188, 129);
  drawInfoRow(doc, "Name", safeText(donation.donorName), 22, 140, 78);
  drawInfoRow(doc, "PAN", safeText(donation.donorPan), 112, 140, 60);
  drawInfoRow(doc, "Email", safeText(donation.donorEmail), 22, 158, 78);
  drawInfoRow(doc, "Phone", safeText(donation.donorPhone), 112, 158, 60);
  drawInfoRow(doc, "Address", safeText(donation.donorAddress), 22, 176, 150);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(190, 0, 39);
  doc.text("Payment & 80G Details", 22, 200);
  doc.setDrawColor(244, 63, 94);
  doc.line(22, 204, 188, 204);
  drawInfoRow(doc, "Payment Mode", paymentMode.replace(/[_-]+/g, " ").toUpperCase(), 22, 213, 60);
  drawInfoRow(doc, "Payment Ref.", paymentReference, 92, 213, 92);
  drawInfoRow(doc, "Organization PAN", safeText(taxExemption.ngoPan), 22, 229, 60);
  drawInfoRow(doc, "80G Reg. No.", safeText(taxExemption.registrationNumber), 92, 229, 92);
  drawInfoRow(doc, "80G Validity", safeText(taxExemption.validity), 22, 245, 60);

  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.2);
  doc.roundedRect(108, 236, 78, 38, 2, 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(doc.splitTextToSize(`Registered Address: ${safeText(taxExemption.address)}`, 82).slice(0, 2), 22, 258);
  doc.text("This computer-generated receipt is valid without a handwritten signature.", 22, 272);

  doc.addImage(qrDataUrl, "PNG", 158, 240, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(190, 0, 39);
  doc.text("SCAN TO VERIFY", 169, 266, { align: "center" });

  drawDigitalStamp(doc, 128, 255);

  return doc.output("arraybuffer");
}
