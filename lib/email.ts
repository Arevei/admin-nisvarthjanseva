import nodemailer from "nodemailer";
import QRCode from "qrcode";
import type { DonationDoc, MemberDoc, VisitorCertificateDoc } from "@/lib/types";
import { generateVisitorCertificatePdf, safeFileName } from "@/lib/visitor-certificates";
import {
  generateDonationReceiptPdf,
  safeFileName as safeDonationFileName,
} from "@/lib/donation-receipts";

const membershipFees: Record<MemberDoc["membershipType"], number> = {
  general: 500,
  active: 1000,
  lifetime: 5000,
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are not fully configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendMembershipApprovalPaymentEmail(member: MemberDoc) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const upiId = process.env.MEMBERSHIP_UPI_ID;

  if (!fromAddress || !upiId) {
    throw new Error("SMTP_FROM/SMTP_USER or MEMBERSHIP_UPI_ID is not configured.");
  }

  const fee = membershipFees[member.membershipType];
  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent("Nisvarthjan Seva Foundation")}&am=${fee}&cu=INR&tn=${encodeURIComponent(`Membership ${member.membershipId}`)}`;
  const qrDataUrl = await QRCode.toDataURL(upiPayload, { margin: 1, width: 240 });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress,
    to: member.email,
    subject: "Membership approved - complete payment",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 8px;">Nisvarthjan Seva Foundation</h2>
        <p style="margin-top: 0; color: #52525b;">Your membership request has been approved by admin.</p>
        <p>Dear ${member.name},</p>
        <p>Your application is approved. Please complete manual payment to activate membership.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Membership ID</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${member.membershipId}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Membership Type</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${member.membershipType}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Amount</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">INR ${fee}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">UPI ID</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${upiId}</td></tr>
        </table>
        <p>Scan this QR to pay:</p>
        <img src="${qrDataUrl}" alt="Payment QR" width="220" height="220" style="border: 1px solid #e4e4e7; border-radius: 8px;" />
        <p style="margin-top: 16px;">After payment, please share transaction details with the foundation team for final activation.</p>
        <p style="color: #52525b;">Thank you.</p>
      </div>
    `,
  });
}

export async function sendVisitorCertificateEmail(certificate: VisitorCertificateDoc, requestUrl: string) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error("SMTP_FROM or SMTP_USER is not configured.");
  }

  const pdf = await generateVisitorCertificatePdf(certificate, requestUrl);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: fromAddress,
    to: certificate.recipientEmail,
    subject: `${certificate.title} - Nisvarthjan Seva Foundation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 8px;">Nisvarthjan Seva Foundation</h2>
        <p style="margin-top: 0; color: #52525b;">A certificate has been issued for you.</p>
        <p>Dear ${certificate.recipientName},</p>
        <p>Please find your certificate attached as a PDF.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Certificate No.</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${certificate.certificateNumber}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Certificate Type</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${certificate.title}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Status</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${certificate.status}</td></tr>
        </table>
        <p style="color: #52525b;">Thank you.</p>
      </div>
    `,
    attachments: [
      {
        filename: `${safeFileName(certificate.certificateNumber)}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendDonationReceiptEmail(donation: DonationDoc, requestUrl: string) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error("SMTP_FROM or SMTP_USER is not configured.");
  }

  const pdf = await generateDonationReceiptPdf(donation, requestUrl);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: fromAddress,
    to: donation.donorEmail,
    subject: "Donation receipt - Nisvarthjan Seva Foundation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 8px;">Nisvarthjan Seva Foundation</h2>
        <p style="margin-top: 0; color: #52525b;">Thank you for your donation.</p>
        <p>Dear ${donation.donorName},</p>
        <p>Your QR-coded donation receipt PDF is attached with this email.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Receipt No.</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${donation.receiptNumber}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Amount</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">INR ${donation.amount.toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">Payment Mode</td><td style="padding: 6px 10px; border: 1px solid #e4e4e7;">${donation.payment?.mode || "manual"}</td></tr>
        </table>
      </div>
    `,
    attachments: [
      {
        filename: `${safeDonationFileName(donation.receiptNumber)}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });
}
