import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { CampaignDoc, DonationDoc } from "@/lib/types";

function toResponse(donation: DonationDoc, campaignTitle?: string | null) {
  return {
    id: donation.id,
    amount: donation.amount,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    donorPhone: donation.donorPhone ?? null,
    campaignId: donation.campaignId ?? null,
    campaignTitle: campaignTitle ?? null,
    purpose: donation.purpose,
    receiptNumber: donation.receiptNumber,
    status: donation.status ?? "paid",
    paymentMode: donation.payment?.mode ?? "manual",
    paymentStatus: donation.payment?.status ?? "paid",
    orderId: donation.payment?.orderId ?? null,
    paymentId: donation.payment?.paymentId ?? null,
    razorpayReceipt: donation.payment?.receipt ?? null,
    paidAt: donation.payment?.paidAt ? donation.payment.paidAt.toISOString() : null,
    createdAt: donation.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const donations = await db.collection<DonationDoc>("donations").find({}).sort({ createdAt: -1 }).toArray();
  const campaignIds = Array.from(new Set(donations.map((donation) => donation.campaignId).filter(Boolean))) as number[];
  const campaigns =
    campaignIds.length > 0
      ? await db.collection<CampaignDoc>("campaigns").find({ id: { $in: campaignIds } }).toArray()
      : [];
  const campaignTitleById = new Map(campaigns.map((campaign) => [campaign.id, campaign.title]));

  return NextResponse.json(
    donations.map((donation) => toResponse(donation, donation.campaignId ? campaignTitleById.get(donation.campaignId) : null)),
  );
}
