import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { ReferralAchievement, ReferralAchievementTier } from "@/lib/types";

export type ReferralAchievementMember = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  membershipId?: string;
  referralAchievement?: ReferralAchievement | null;
};

export const referralAchievementTiers: Array<{
  tier: ReferralAchievementTier;
  label: string;
  thresholdAmount: number;
  color: [number, number, number];
}> = [
  { tier: "silver", label: "Silver", thresholdAmount: 10000, color: [120, 125, 134] },
  { tier: "gold", label: "Gold", thresholdAmount: 25000, color: [180, 129, 19] },
  { tier: "platinum", label: "Platinum", thresholdAmount: 50000, color: [92, 116, 138] },
  { tier: "diamond", label: "Diamond", thresholdAmount: 100000, color: [16, 119, 145] },
];

export function getReferralAchievementTierConfig(tier: ReferralAchievementTier) {
  return referralAchievementTiers.find((item) => item.tier === tier) ?? referralAchievementTiers[0];
}

export function generateReferralAchievementCertificateNumber(tier: ReferralAchievementTier) {
  return `RAF-${tier.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
}

export function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "referral-achievement";
}

export function formatAmount(amount: number) {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: Date | string | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getVerificationBaseUrl(requestUrl: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(requestUrl).origin;
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

function addCenteredFitText(doc: jsPDF, text: string, y: number, size: number, minSize: number, maxWidth: number) {
  let fontSize = size;
  doc.setFontSize(fontSize);

  while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }

  doc.text(text, 148.5, y, { align: "center", maxWidth });
}

export async function generateReferralAchievementCertificatePdf(
  member: ReferralAchievementMember,
  requestUrl: string,
) {
  const achievement = member.referralAchievement;
  if (!achievement) {
    throw new Error("Referral achievement is not allotted.");
  }

  const tierConfig = getReferralAchievementTierConfig(achievement.tier);
  const [r, g, b] = tierConfig.color;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const verificationUrl = `${getVerificationBaseUrl(requestUrl)}/verify?certificateNumber=${encodeURIComponent(achievement.certificateNumber)}&documentType=referral-achievement`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 297, 210, "F");
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(1.4);
  doc.rect(12, 12, 273, 186);
  doc.setLineWidth(0.35);
  doc.rect(19, 19, 259, 172);

  const logo = getLogo();
  const logoHeight = 23;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", (297 - logoWidth) / 2, 23, logoWidth, logoHeight);

  doc.addImage(qrDataUrl, "PNG", 246, 24, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text("SCAN TO VERIFY", 258, 53, { align: "center" });

  doc.setFontSize(17);
  doc.text("REFERRAL ACHIEVEMENT CERTIFICATE", 148.5, 62, { align: "center" });

  doc.setFillColor(r, g, b);
  doc.circle(148.5, 82, 17, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(tierConfig.label.toUpperCase(), 148.5, 80, { align: "center" });
  doc.setFontSize(8);
  doc.text("BADGE", 148.5, 88, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(89, 78, 73);
  doc.text("This certificate is proudly awarded to", 148.5, 110, { align: "center" });

  doc.setFont("times", "bolditalic");
  doc.setTextColor(24, 24, 27);
  addCenteredFitText(doc, safeText(member.name).toUpperCase(), 126, 28, 17, 205);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(89, 78, 73);
  doc.text(
    `for collecting ${formatAmount(achievement.donationAmount)} through donation referrals.`,
    148.5,
    141,
    { align: "center" },
  );

  const rows: Array<[string, string]> = [
    ["Certificate No.", achievement.certificateNumber],
    ["Membership ID", safeText(member.membershipId)],
    ["Achievement", `${tierConfig.label} Badge`],
    ["Issued On", formatDate(achievement.issuedAt)],
  ];

  doc.setFontSize(10);
  rows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 42 : 166;
    const y = index < 2 ? 162 : 174;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(35, 35, 35);
    doc.text(value, x + 38, y, { maxWidth: 70 });
  });

  doc.setDrawColor(35, 35, 35);
  doc.line(205, 184, 263, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(r, g, b);
  doc.text("Authorized Signature", 234, 190, { align: "center" });

  return doc.output("arraybuffer");
}
