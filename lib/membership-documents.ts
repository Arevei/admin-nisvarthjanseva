import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

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

function imageFormatFromContentType(contentType: string | null) {
  const normalized = (contentType || "").toLowerCase();
  if (normalized.includes("png")) return "PNG";
  if (normalized.includes("webp")) return "WEBP";
  return "JPEG";
}

async function responseToDataUrl(response: Response) {
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const photoBuffer = Buffer.from(await response.arrayBuffer());
  return {
    dataUrl: `data:${contentType};base64,${photoBuffer.toString("base64")}`,
    format: imageFormatFromContentType(contentType),
  };
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

export function getVerificationBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(requestUrl).origin;
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

export function getMembershipReceiptNumber(member: MemberDocumentRecord) {
  return member.payment?.receipt || `MRC-${safeText(member.membershipId).replace(/[^a-z0-9]+/gi, "-")}`;
}

export async function generateMembershipCertificatePdf(member: MemberDocumentRecord, requestUrl: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const certificateNumber = safeText(member.certificateNumber);
  const issuedAt = formatDate(member.joinedAt);
  const membershipType = formatMembershipType(member.membershipType);
  const location = [member.city, member.state].filter(Boolean).join(", ") || "Not available";
  const verificationUrl = `${getVerificationBaseUrl(requestUrl)}/verify/${encodeURIComponent(certificateNumber)}`;
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
  addCenteredFitText(doc, safeText(member.name).toUpperCase(), 94, 30, 18, 210, [25, 25, 25]);

  doc.setFont("helvetica", "normal");
  addCenteredText(
    doc,
    `as a ${membershipType} member of Nisvarthjan Seva Foundation.`,
    108,
    13,
    [89, 78, 73],
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(190, 0, 39);
  doc.text("Certificate No.", 34, 124);
  doc.text("Membership ID", 34, 135);
  doc.text("Issued On", 34, 146);

  doc.setTextColor(35, 35, 35);
  doc.text(certificateNumber, 78, 124);
  addValueText(doc, safeText(member.membershipId), 78, 135, 72);
  doc.text(issuedAt, 78, 146);

  doc.setTextColor(190, 0, 39);
  doc.text("Email", 178, 124);
  doc.text("Phone", 178, 135);
  doc.text("Location", 178, 146);

  doc.setTextColor(35, 35, 35);
  addValueText(doc, safeText(member.email), 207, 124, 58);
  addValueText(doc, safeText(member.phone), 207, 135, 58);
  addValueText(doc, location, 207, 146, 58);

  drawDigitalStamp(doc, 234, 176);

  return doc.output("arraybuffer");
}

export async function generateMembershipReceiptPdf(member: MemberDocumentRecord, requestUrl: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const receiptNumber = getMembershipReceiptNumber(member);
  const certificateNumber = safeText(member.certificateNumber);
  const amount = member.payment?.amount ? `INR ${member.payment.amount.toLocaleString("en-IN")}` : "Not available";
  const paidAt = formatDate(member.payment?.paidAt || member.joinedAt);
  const verifyUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(receiptNumber)}&documentType=membership-receipt`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 210, 297, "F");
  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(1);
  doc.rect(14, 14, 182, 269);
  doc.setLineWidth(0.25);
  doc.rect(20, 20, 170, 257);

  const logo = getCertificateLogo();
  const logoHeight = 20;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", (210 - logoWidth) / 2, 28, logoWidth, logoHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(190, 0, 39);
  doc.text("MEMBERSHIP RECEIPT", 105, 62, { align: "center" });
  doc.setDrawColor(190, 0, 39);
  doc.line(55, 69, 155, 69);

  doc.addImage(qrDataUrl, "PNG", 155, 30, 24, 24);
  doc.setFontSize(7);
  doc.text("SCAN TO VERIFY", 167, 58, { align: "center" });

  const rows: Array<[string, string]> = [
    ["Receipt No.", receiptNumber],
    ["Member Name", safeText(member.name).toUpperCase()],
    ["Membership ID", safeText(member.membershipId)],
    ["Membership Type", formatMembershipType(member.membershipType)],
    ["Certificate No.", certificateNumber],
    ["Amount Paid", amount],
    ["Payment ID", safeText(member.payment?.paymentId)],
    ["Payment Date", paidAt],
    ["Email", safeText(member.email)],
    ["Phone", safeText(member.phone)],
  ];

  doc.setFontSize(11);
  rows.forEach(([label, value], index) => {
    const y = 88 + index * 13;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 0, 39);
    doc.text(label, 36, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(35, 35, 35);
    addValueText(doc, value, 88, y, 82);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(89, 78, 73);
  doc.text("Thank you for becoming a member of Nisvarthjan Seva Foundation.", 105, 232, { align: "center" });

  drawDigitalStamp(doc, 150, 252);

  return doc.output("arraybuffer");
}

function fitText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, size: number, minSize = 5) {
  let fontSize = size;
  doc.setFontSize(fontSize);

  while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }

  doc.text(text, x, y);
}

function drawIdCardShell(doc: jsPDF) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 85.6, 54, "F");
  doc.setDrawColor(190, 0, 39);
  doc.setLineWidth(0.6);
  doc.roundedRect(1.5, 1.5, 82.6, 51, 3, 3);
  doc.setFillColor(190, 0, 39);
  doc.roundedRect(1.5, 1.5, 82.6, 9.5, 3, 3, "F");
  doc.rect(1.5, 7.5, 82.6, 3.5, "F");
}

export async function generateMembershipIdCardPdf(member: MemberDocumentRecord, requestUrl: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
  const logo = getCertificateLogo();
  const logoDataUrl = logo.dataUrl;
  const headerLogoHeight = 5;
  const headerLogoWidth = headerLogoHeight * (logo.width / logo.height);
  const certificateNumber = safeText(member.certificateNumber);
  const verificationUrl = `${getVerificationBaseUrl(requestUrl)}/verify/${encodeURIComponent(certificateNumber)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });

  const memberName = safeText(member.name).toUpperCase();
  const joinedAt = formatDate(member.joinedAt);
  const location = [member.city, member.state].filter(Boolean).join(", ") || "Not available";

  drawIdCardShell(doc);

  doc.addImage(logoDataUrl, "PNG", 4.2, 3.1, headerLogoWidth, headerLogoHeight);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  fitText(doc, "NISVARTHJAN SEVA FOUNDATION", 19, 6.5, 60, 7, 4.5);
  doc.setFont("helvetica", "normal");
  fitText(doc, "Membership Identity Card", 19, 9.3, 60, 4.7, 3.8);

  // Photo area - either show uploaded photo or placeholder
  const photoBoxX = 5;
  const photoBoxY = 15;
  const photoBoxSize = 20;

  if (member.photo) {
    console.log("[ID Card] Attempting to load photo from:", member.photo);
    try {
      // Fetch and add the member's uploaded photo
      const photoResponse = await fetch(member.photo);
      console.log("[ID Card] Photo fetch status:", photoResponse.status);
      if (!photoResponse.ok) {
        throw new Error(`Failed to fetch photo: ${photoResponse.status}`);
      }
      const photo = await responseToDataUrl(photoResponse);
      console.log("[ID Card] Photo data URL length:", photo.dataUrl.length);
      doc.addImage(photo.dataUrl, photo.format, photoBoxX + 1, photoBoxY + 1, photoBoxSize - 2, photoBoxSize - 2, undefined, "MEDIUM");
      console.log("[ID Card] Photo added successfully");
    } catch (error) {
      console.error("[ID Card] Failed to add photo:", error);
      // If photo fails to load, show placeholder
      drawPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoBoxSize);
    }
  } else {
    console.log("[ID Card] No photo URL in member - using placeholder");
    drawPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoBoxSize);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  fitText(doc, memberName, 29, 17, 50, 9, 5.5);

  const rows: Array<[string, string]> = [
    ["Member ID", safeText(member.membershipId)],
    ["Type", formatMembershipType(member.membershipType)],
    ["Phone", safeText(member.phone)],
    ["Joined", joinedAt],
    ["Location", location],
  ];

  doc.setFontSize(5.6);
  rows.forEach(([label, value], index) => {
    const y = 22 + index * 4.2;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 0, 39);
    doc.text(`${label}:`, 29, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(39, 39, 42);
    fitText(doc, value, 43, y, 36, 5.6, 4);
  });

  doc.setFillColor(255, 245, 247);
  doc.roundedRect(5, 41, 75.6, 5.2, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.setTextColor(190, 0, 39);
  doc.text("ID NO.", 8, 44.5);
  doc.setTextColor(24, 24, 27);
  fitText(doc, safeText(member.membershipId), 18, 44.5, 59, 5.7, 4);

  doc.setDrawColor(82, 82, 91);
  doc.line(8, 50, 30, 50);
  doc.line(54, 50, 78, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.8);
  doc.setTextColor(82, 82, 91);
  doc.text("Member Signature", 19, 52, { align: "center" });
  doc.text("Authority Signature", 66, 52, { align: "center" });

  doc.addPage([85.6, 54], "landscape");
  drawIdCardShell(doc);

  doc.setGState(doc.GState({ opacity: 0.08 }));
  const watermarkHeight = 25;
  const watermarkWidth = watermarkHeight * (logo.width / logo.height);
  doc.addImage(logoDataUrl, "PNG", (85.6 - watermarkWidth) / 2, 16, watermarkWidth, watermarkHeight);
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("VERIFY MEMBERSHIP", 42.8, 7.3, { align: "center" });

  doc.addImage(qrDataUrl, "PNG", 6, 14, 23, 23);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 0, 39);
  doc.setFontSize(4.5);
  doc.text("SCAN TO VERIFY", 17.5, 40, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(6);
  doc.text("Nisvarthjan Seva Foundation", 34, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.7);
  doc.setTextColor(63, 63, 70);
  doc.text(doc.splitTextToSize(`Certificate: ${certificateNumber}`, 45), 34, 22);
  doc.text(doc.splitTextToSize(`Email: ${safeText(member.email)}`, 45), 34, 28);
  doc.text(doc.splitTextToSize(`Address: ${safeText(member.address)}`, 45).slice(0, 2), 34, 34);

  doc.setDrawColor(190, 0, 39);
  doc.line(34, 43, 78, 43);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 0, 39);
  doc.setFontSize(4.3);
  doc.text("This card remains property of the foundation.", 56, 47, { align: "center" });
  doc.text("If found, please contact the issuing authority.", 56, 50, { align: "center" });

  return doc.output("arraybuffer");
}
