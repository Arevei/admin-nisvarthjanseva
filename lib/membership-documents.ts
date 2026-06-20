import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { MemberDoc } from "@/lib/types";

export interface MemberDocumentRecord {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  membershipType?: string;
  membershipId?: string;
  status?: string;
  certificateNumber?: string | null;
  joinedAt?: string | Date;
  photo?: string | null;
  payment?: {
    mode?: string;
    status?: string;
    orderId?: string;
    paymentId?: string;
    receipt?: string;
    amount?: number;
    currency?: string;
    paidAt?: string | Date;
  };
}

export function formatDate(value: string | Date | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatMembershipType(value: string | undefined) {
  if (!value) return "Member";

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, size: number) {
  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, size, size, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(190, 0, 39);
  doc.text("PASTE", x + size / 2, y + size / 2 - 1, { align: "center" });
  doc.text("PHOTO", x + size / 2, y + size / 2 + 1.5, { align: "center" });
}

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "membership-document";
}

function getPngDimensions(buffer: Buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getCertificateLogo() {
  const logoPath = path.join(process.cwd(), "public", "brand", "footer-logo.png");
  const logoBuffer = readFileSync(logoPath);

  return {
    dataUrl: `data:image/png;base64,${logoBuffer.toString("base64")}`,
    ...getPngDimensions(logoBuffer),
  };
}

function addCenteredText(doc: jsPDF, text: string, y: number, size: number, color: [number, number, number]) {
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(text, 148.5, y, { align: "center" });
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

function addValueText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = doc.splitTextToSize(text, maxWidth).slice(0, 2);
  doc.text(lines, x, y);
}

function drawDigitalStamp(doc: jsPDF, x: number, y: number, color: [number, number, number] = [190, 0, 39]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.circle(x, y, 16, "S");
  doc.setLineWidth(0.25);
  doc.circle(x, y, 12.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.setFontSize(5.3);
  doc.text("NISVARTHJAN", x, y - 6.5, { align: "center" });
  doc.text("SEVA FOUNDATION", x, y - 2, { align: "center" });
  doc.setFontSize(6.4);
  doc.text("DIGITALLY", x, y + 4.5, { align: "center" });
  doc.text("SIGNED", x, y + 9.5, { align: "center" });
}

export function getMembershipReceiptNumber(member: MemberDocumentRecord) {
  return member.payment?.receipt || `MRC-${safeText(member.membershipId).replace(/[^a-z0-9]+/gi, "-")}`;
}

function memberToRecord(member: MemberDoc): MemberDocumentRecord {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    address: member.address,
    city: member.city,
    state: member.state,
    membershipType: member.membershipType,
    membershipId: member.membershipId,
    status: member.status,
    certificateNumber: member.certificateNumber,
    joinedAt: member.joinedAt,
    payment: member.payment,
  };
}

export async function generateMembershipCertificatePdf(member: MemberDoc, requestUrl: string) {
  const record = memberToRecord(member);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const certificateNumber = safeText(record.certificateNumber);
  const issuedAt = formatDate(record.joinedAt);
  const membershipType = formatMembershipType(record.membershipType);
  const location = [record.city, record.state].filter(Boolean).join(", ") || "Not available";
  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin}/verify/${encodeURIComponent(certificateNumber)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 297, 210, "F");

  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, 273, 186);
  doc.setLineWidth(0.35);
  doc.rect(18, 18, 261, 174);

  const logo = getCertificateLogo();
  const logoHeight = 22;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", (297 - logoWidth) / 2, 22, logoWidth, logoHeight);

  doc.addImage(qrDataUrl, "PNG", 244, 22, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(190, 0, 39);
  doc.text("SCAN TO VERIFY", 256, 51, { align: "center" });

  doc.setFont("helvetica", "normal");
  addCenteredText(doc, "MEMBERSHIP CERTIFICATE", 58, 18, [190, 0, 39]);

  doc.setDrawColor(190, 0, 39);
  doc.line(92, 66, 205, 66);

  doc.setFont("helvetica", "normal");
  addCenteredText(doc, "This certificate is proudly issued to", 80, 13, [89, 78, 73]);

  doc.setFont("times", "bolditalic");
  addCenteredFitText(doc, safeText(record.name).toUpperCase(), 94, 30, 18, 210, [25, 25, 25]);

  doc.setFont("helvetica", "normal");
  addCenteredText(doc, "in recognition of their valuable membership and commitment to the", 108, 12, [89, 78, 73]);
  addCenteredText(doc, "Nisvarthjan Seva Foundation community.", 116, 12, [89, 78, 73]);

  doc.setFont("helvetica", "bold");
  addCenteredText(doc, membershipType.toUpperCase() + " MEMBER", 130, 14, [190, 0, 39]);

  doc.setFont("helvetica", "normal");
  addCenteredText(doc, `Member ID: ${safeText(record.membershipId)}`, 142, 10, [89, 78, 73]);
  addCenteredText(doc, `Certificate No.: ${certificateNumber}`, 149, 10, [89, 78, 73]);
  addCenteredText(doc, `Location: ${location}`, 156, 10, [89, 78, 73]);
  addCenteredText(doc, `Date of Issue: ${issuedAt}`, 163, 10, [89, 78, 73]);

  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(0.5);
  doc.line(40, 180, 110, 180);
  doc.setLineWidth(0.25);
  doc.line(188, 180, 258, 180);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(190, 0, 39);
  doc.text("President", 75, 187, { align: "center" });
  doc.text("Secretary", 223, 187, { align: "center" });

  drawDigitalStamp(doc, 148.5, 182);

  return doc.output("arraybuffer");
}

export async function generateMembershipIdCardPdf(member: MemberDoc, requestUrl: string) {
  const record = memberToRecord(member);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const membershipType = formatMembershipType(record.membershipType);
  const issuedAt = formatDate(record.joinedAt);
  const location = [record.city, record.state].filter(Boolean).join(", ") || "Not available";

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 148.5, 210, "F");

  doc.setFillColor(190, 0, 39);
  doc.rect(0, 0, 148.5, 42, "F");

  const logoPath = path.join(process.cwd(), "public", "brand", "footer-logo.png");
  const logoBuffer = readFileSync(logoPath);
  const { width: logoW, height: logoH } = getPngDimensions(logoBuffer);
  const logoHeight = 28;
  const logoWidth = logoHeight * (logoW / logoH);
  doc.addImage(`data:image/png;base64,${logoBuffer.toString("base64")}`, "PNG", (148.5 - logoWidth) / 2, 7, logoWidth, logoHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("NISVARTHJAN SEVA FOUNDATION", 74.25, 38, { align: "center" });

  doc.setFillColor(190, 0, 39);
  doc.roundedRect(14, 50, 120, 120, 3, 3);
  drawPhotoPlaceholder(doc, 44, 68, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 25, 25);
  doc.text(safeText(record.name), 74.25, 178, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(89, 78, 73);
  doc.text(membershipType.toUpperCase() + " MEMBER", 74.25, 185, { align: "center" });

  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(0.5);
  doc.line(24, 192, 124, 192);

  doc.setFontSize(7.5);
  doc.setTextColor(89, 78, 73);
  doc.text(`ID: ${safeText(record.membershipId)}`, 74.25, 198, { align: "center" });
  doc.text(location, 74.25, 204, { align: "center" });

  return doc.output("arraybuffer");
}