import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DonationDoc } from "@/lib/types";

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

function addValueText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = doc.splitTextToSize(text, maxWidth).slice(0, 2);
  doc.text(lines, x, y);
}

export async function generateDonationReceiptPdf(donation: DonationDoc, requestUrl: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const paidAt = donation.payment?.paidAt || donation.createdAt;
  const paymentMode = donation.payment?.mode || "manual";
  const paymentReference = donation.payment?.paymentId || donation.payment?.orderId || donation.payment?.receipt || donation.receiptNumber;
  const verifyUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(donation.receiptNumber)}&documentType=donation-receipt`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 210, 297, "F");
  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(1);
  doc.rect(14, 14, 182, 269);
  doc.setLineWidth(0.25);
  doc.rect(20, 20, 170, 257);

  const logo = getLogo();
  const logoHeight = 22;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", (210 - logoWidth) / 2, 27, logoWidth, logoHeight);

  doc.addImage(qrDataUrl, "PNG", 155, 30, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(190, 0, 39);
  doc.text("SCAN TO VERIFY", 167, 58, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(21);
  doc.setTextColor(190, 0, 39);
  doc.text("DONATION RECEIPT", 105, 66, { align: "center" });
  doc.setDrawColor(190, 0, 39);
  doc.line(55, 73, 155, 73);

  const rows: Array<[string, string]> = [
    ["Receipt No.", donation.receiptNumber],
    ["Donor Name", donation.donorName],
    ["Email", donation.donorEmail],
    ["Phone", safeText(donation.donorPhone)],
    ["Amount", `INR ${donation.amount.toLocaleString("en-IN")}`],
    ["Purpose", normalizeDonationPurpose(donation.purpose)],
    ["Payment Mode", paymentMode.replace(/[_-]+/g, " ").toUpperCase()],
    ["Payment Ref.", paymentReference],
    ["Paid On", formatDate(paidAt)],
    ["Status", donation.status || donation.payment?.status || "paid"],
  ];

  doc.setFontSize(11);
  rows.forEach(([label, value], index) => {
    const y = 92 + index * 13;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 0, 39);
    doc.text(label, 34, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(35, 35, 35);
    addValueText(doc, value, 84, y, 88);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(89, 78, 73);
  doc.text("Thank you for supporting Nisvarthjan Seva Foundation.", 105, 232, { align: "center" });

  doc.setDrawColor(35, 35, 35);
  doc.line(126, 252, 174, 252);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(190, 0, 39);
  doc.text("Authorized Signature", 150, 258, { align: "center" });

  return doc.output("arraybuffer");
}
