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

/**
 * Load Hindi font for rendering Devanagari text in PDFs
 * Uses TiroDevanagariHindi-Regular.ttf from public folder
 */
function getHindiFont() {
  try {
    const fontPath = path.join(process.cwd(), "public", "TiroDevanagariHindi-Regular.ttf");
    const fontBuffer = readFileSync(fontPath);
    return fontBuffer.toString("base64");
  } catch (error) {
    console.warn("Hindi font not found, will use fallback rendering");
    return null;
  }
}

// Hindi verse for the receipt
const HINDI_VERSE = "रामदूत मैं मात जानकी लेता हूँ शपथ, निस्वार्थ सेवा के लिए करुणानिधान की।";

/**
 * Normalize donation purpose to English (mapping from form selection)
 * Form options are: Education Support, Health Services, Poor & Needy Support,
 * Environment Campaign, Disaster Relief, General Donation
 */
function normalizeDonationPurpose(value: string): string {
  if (!value) return "General Donation";
  const text = String(value).trim();
  // All form values are already in English from the frontend dropdown
  // This is a safety check for any legacy data
  return text;
}

export async function generateDonationReceiptPdf(donation: DonationDoc, requestUrl: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  
  // Load and register Hindi font for Devanagari text rendering
  const hindiFont = getHindiFont();
  if (hindiFont) {
    try {
      doc.addFileToVFS("TiroDevanagariHindi-Regular.ttf", hindiFont);
      doc.addFont("TiroDevanagariHindi-Regular.ttf", "TiroDevanagari", "normal");
    } catch (error) {
      console.warn("Failed to register Hindi font:", error);
    }
  }
  
  const paidAt = donation.payment?.paidAt || donation.createdAt;
  const paymentMode = donation.payment?.mode || "manual";
  const paymentReference = donation.payment?.paymentId || donation.payment?.orderId || donation.payment?.receipt || donation.receiptNumber;
  const taxExemption = get80GDetails();
  const verifyUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(donation.receiptNumber)}&documentType=donation-receipt`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  const cardTop = 36;
  const cardHeight = 235;

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
  doc.roundedRect(22, 50, 166, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(190, 0, 39);
  doc.text("RECEIPT NO.", 30, 51);
  doc.text("PAID ON", 96, 51);
  doc.text("STATUS", 150, 51);
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(donation.receiptNumber, 30, 57);
  doc.text(formatDate(paidAt), 96, 57);
  doc.text((donation.status || donation.payment?.status || "paid").toUpperCase(), 150, 57);

  doc.setFillColor(24, 24, 27);
  doc.roundedRect(22, 72, 76, 28, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(212, 212, 216);
  doc.text("AMOUNT RECEIVED", 30, 81);
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`INR ${donation.amount.toLocaleString("en-IN")}`, 30, 94);

  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(106, 72, 82, 28, 2, 2);
  drawInfoRow(doc, "Purpose", normalizeDonationPurpose(donation.purpose), 114, 81, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(190, 0, 39);
  doc.text("Donor Details", 22, 114);
  doc.setDrawColor(244, 63, 94);
  doc.line(22, 117, 188, 117);
  drawInfoRow(doc, "Name", safeText(donation.donorName), 22, 126, 78);
  drawInfoRow(doc, "PAN", safeText(donation.donorPan), 112, 126, 60);
  drawInfoRow(doc, "Email", safeText(donation.donorEmail), 22, 141, 78);
  drawInfoRow(doc, "Phone", safeText(donation.donorPhone), 112, 141, 60);
  drawInfoRow(doc, "Address", safeText(donation.donorAddress), 22, 156, 150);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(190, 0, 39);
  doc.text("Payment & 80G Details", 22, 176);
  doc.setDrawColor(244, 63, 94);
  doc.line(22, 179, 188, 179);
  drawInfoRow(doc, "Payment Mode", paymentMode.replace(/[_-]+/g, " ").toUpperCase(), 22, 186, 60);
  drawInfoRow(doc, "Payment Ref.", paymentReference, 92, 186, 92);
  drawInfoRow(doc, "Organization PAN", safeText(taxExemption.ngoPan), 22, 199, 60);
  drawInfoRow(doc, "80G Reg. No.", safeText(taxExemption.registrationNumber), 92, 199, 92);
  drawInfoRow(doc, "80G Validity", safeText(taxExemption.validity), 22, 212, 60);

  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.2);
  doc.roundedRect(108, 219, 78, 32, 2, 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(113, 113, 122);
  // Render Sanskrit verse using Hindi font
  if (hindiFont) {
    doc.setFont("TiroDevanagari", "normal");
    doc.setFontSize(5.5);
    doc.text(HINDI_VERSE, 22, 228, { maxWidth: 160 });
    doc.setFont("helvetica", "normal");
  } else {
    doc.text(doc.splitTextToSize("[Foundation Sanskrit Verse - See digital certificate]", 160).slice(0, 1), 22, 228);
  }
  doc.text(doc.splitTextToSize(`Registered Address: ${safeText(taxExemption.address)}`, 82).slice(0, 2), 22, 235);
  doc.text("This computer-generated receipt is valid without a handwritten signature.", 22, 254);

  doc.addImage(qrDataUrl, "PNG", 158, 223, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(190, 0, 39);
  doc.text("SCAN TO VERIFY", 168, 248, { align: "center" });

  drawDigitalStamp(doc, 128, 235);

  return doc.output("arraybuffer");
}
