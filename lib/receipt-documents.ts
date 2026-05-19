import { readFileSync } from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import type { DonationDoc, EventRegistrationReceiptDoc, MemberDoc } from "@/lib/types";

type ReceiptKind = "membership" | "donation" | "event";

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "receipt";
}

function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function formatAmount(value: number | null | undefined) {
  return `INR ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(value: Date | string | null | undefined) {
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

function getMembershipReceiptNumber(member: MemberDoc) {
  return member.payment?.receipt || `MRC-${safeText(member.membershipId).replace(/[^a-z0-9]+/gi, "-")}`;
}

function baseReceiptPdf(title: string, rows: Array<[string, string]>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(190, 0, 39);
  doc.text(title, 105, 66, { align: "center" });
  doc.line(55, 73, 155, 73);

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

export function generateMembershipPaymentReceiptPdf(member: MemberDoc) {
  return baseReceiptPdf("MEMBERSHIP PAYMENT RECEIPT", [
    ["Receipt No.", getMembershipReceiptNumber(member)],
    ["Member Name", safeText(member.name)],
    ["Membership ID", safeText(member.membershipId)],
    ["Membership Type", safeText(member.membershipType)],
    ["Email", safeText(member.email)],
    ["Phone", safeText(member.phone)],
    ["Amount", formatAmount(member.payment?.amount)],
    ["Payment Mode", safeText(member.payment?.mode).replace(/[_-]+/g, " ").toUpperCase()],
    ["Payment Ref.", safeText(member.payment?.paymentId || member.payment?.orderId || member.payment?.receipt)],
    ["Paid On", formatDate(member.payment?.paidAt || member.joinedAt)],
    ["Status", safeText(member.payment?.status || member.status)],
  ]);
}

export function generateEventRegistrationReceiptPdf(receipt: EventRegistrationReceiptDoc) {
  return baseReceiptPdf("EVENT REGISTRATION RECEIPT", [
    ["Receipt No.", receipt.receiptNumber],
    ["Event Name", receipt.eventName],
    ["Attendee Name", receipt.attendeeName],
    ["Email", receipt.attendeeEmail],
    ["Phone", safeText(receipt.attendeePhone)],
    ["Amount", formatAmount(receipt.amount)],
    ["Payment Mode", receipt.payment.mode.replace(/[_-]+/g, " ").toUpperCase()],
    ["Payment Ref.", safeText(receipt.payment.reference)],
    ["Paid On", formatDate(receipt.payment.paidAt)],
    ["Status", receipt.status],
    ["Notes", safeText(receipt.notes)],
  ]);
}

export function getReceiptIdentity(kind: ReceiptKind, record: MemberDoc | DonationDoc | EventRegistrationReceiptDoc) {
  if (kind === "membership") {
    const member = record as MemberDoc;
    return {
      receiptNumber: getMembershipReceiptNumber(member),
      amount: Number(member.payment?.amount ?? 0),
      personName: member.name,
      personEmail: member.email,
      paidAt: member.payment?.paidAt || member.joinedAt,
      paymentMode: member.payment?.mode || "manual",
      status: member.payment?.status || member.status,
    };
  }

  if (kind === "event") {
    const eventReceipt = record as EventRegistrationReceiptDoc;
    return {
      receiptNumber: eventReceipt.receiptNumber,
      amount: eventReceipt.amount,
      personName: eventReceipt.attendeeName,
      personEmail: eventReceipt.attendeeEmail,
      paidAt: eventReceipt.payment.paidAt,
      paymentMode: eventReceipt.payment.mode,
      status: eventReceipt.status,
    };
  }

  const donation = record as DonationDoc;
  return {
    receiptNumber: donation.receiptNumber,
    amount: donation.amount,
    personName: donation.donorName,
    personEmail: donation.donorEmail,
    paidAt: donation.payment?.paidAt || donation.createdAt,
    paymentMode: donation.payment?.mode || "manual",
    status: donation.payment?.status || donation.status || "paid",
  };
}

export function generateReceiptReportPdf({
  members,
  donations,
  eventReceipts,
}: {
  members: MemberDoc[];
  donations: DonationDoc[];
  eventReceipts: EventRegistrationReceiptDoc[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const paidMemberships = members.filter((member) => member.payment?.status === "paid" || member.status === "active");
  const paidDonations = donations.filter((donation) => (donation.payment?.status || donation.status || "paid") === "paid");
  const cashDonations = paidDonations.filter((donation) => donation.payment?.mode === "cash");
  const paidEvents = eventReceipts.filter((receipt) => receipt.status === "paid");
  const totals = {
    membership: paidMemberships.reduce((total, member) => total + Number(member.payment?.amount ?? 0), 0),
    donation: paidDonations.reduce((total, donation) => total + donation.amount, 0),
    event: paidEvents.reduce((total, receipt) => total + receipt.amount, 0),
    cash: cashDonations.reduce((total, donation) => total + donation.amount, 0),
  };

  doc.setFillColor(255, 252, 248);
  doc.rect(0, 0, 210, 297, "F");
  const logo = getLogo();
  const logoHeight = 18;
  const logoWidth = logoHeight * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, "PNG", 18, 14, logoWidth, logoHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(190, 0, 39);
  doc.text("Receipt Management Report", 18, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);
  doc.text(`Generated: ${formatDate(new Date())}`, 18, 55);
  doc.line(18, 63, 192, 63);

  const summaryRows: Array<[string, string, string]> = [
    ["Membership Payment Receipts", String(paidMemberships.length), formatAmount(totals.membership)],
    ["Donation Payment Receipts", String(paidDonations.length), formatAmount(totals.donation)],
    ["Event Registration Receipts", String(paidEvents.length), formatAmount(totals.event)],
    ["Cash Donation Receipts", String(cashDonations.length), formatAmount(totals.cash)],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(190, 0, 39);
  doc.text("Receipt Type", 20, 78);
  doc.text("Count", 124, 78);
  doc.text("Total", 170, 78, { align: "right" });
  doc.setDrawColor(228, 228, 231);
  doc.line(18, 82, 192, 82);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(39, 39, 42);
  summaryRows.forEach(([label, count, amount], index) => {
    const y = 94 + index * 12;
    doc.text(label, 20, y);
    doc.text(count, 124, y);
    doc.text(amount, 170, y, { align: "right" });
  });

  let y = 158;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 0, 39);
  doc.text("Recent Receipts", 20, y);
  y += 10;

  const recentReceipts = [
    ...paidMemberships.map((member) => ({ kind: "Membership", ...getReceiptIdentity("membership", member) })),
    ...paidDonations.map((donation) => ({ kind: donation.payment?.mode === "cash" ? "Cash Donation" : "Donation", ...getReceiptIdentity("donation", donation) })),
    ...paidEvents.map((receipt) => ({ kind: "Event", ...getReceiptIdentity("event", receipt) })),
  ]
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 18);

  doc.setFontSize(8);
  recentReceipts.forEach((receipt) => {
    if (y > 270) return;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(39, 39, 42);
    doc.text(`${receipt.kind} - ${receipt.receiptNumber}`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(82, 82, 91);
    doc.text(`${receipt.personName} | ${formatAmount(receipt.amount)} | ${formatDate(receipt.paidAt)}`, 20, y + 5);
    y += 13;
  });

  return doc.output("arraybuffer");
}
