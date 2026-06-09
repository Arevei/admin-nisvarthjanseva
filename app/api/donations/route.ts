import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendDonationReceiptEmail } from "@/lib/email";
import { issueReferralAchievementIfEligible } from "@/lib/referral-achievement-service";
import type { CampaignDoc, DonationDoc, MemberDoc } from "@/lib/types";

function generateReceiptNumber() {
  return `RCP-NSF-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function toResponse(donation: DonationDoc, campaignTitle?: string | null) {
  return {
    id: donation.id,
    amount: donation.amount,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    donorPhone: donation.donorPhone ?? null,
    donorPan: donation.donorPan ?? null,
    donorAddress: donation.donorAddress ?? null,
    campaignId: donation.campaignId ?? null,
    campaignTitle: campaignTitle ?? null,
    purpose: donation.purpose,
    receiptNumber: donation.receiptNumber,
    status: donation.status ?? "paid",
    referral: donation.referral ?? null,
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as {
    amount?: number;
    donorName?: string;
    donorEmail?: string;
    donorPhone?: string;
    donorPan?: string;
    donorAddress?: string;
    campaignId?: number | null;
    purpose?: string;
    referralCode?: string;
    memberId?: number | string;
    paymentMode?: "cash" | "upi" | "bank_transfer" | "other" | "manual";
    paymentReference?: string;
  };
  const amount = Number(body.amount);
  if (!amount || amount <= 0 || !body.purpose) {
    return NextResponse.json({ error: "amount and purpose are required" }, { status: 400 });
  }

  const db = await getDb();
  const selectedMemberId = Number(body.memberId);
  const selectedMember = selectedMemberId
    ? await db.collection<MemberDoc>("members").findOne({ id: selectedMemberId })
    : null;
  const donorName = selectedMember?.name || String(body.donorName ?? "").trim();
  const donorEmail = selectedMember?.email || String(body.donorEmail ?? "").trim();
  const donorPhone = selectedMember?.phone || String(body.donorPhone ?? "").trim();
  const donorPan = String(body.donorPan ?? "").trim().toUpperCase();
  const donorAddress = String(body.donorAddress ?? "").trim();

  if (!donorName || !donorEmail) {
    return NextResponse.json({ error: "donorName and donorEmail are required" }, { status: 400 });
  }

  const referralCode = String(body.referralCode ?? "").trim().toUpperCase();
  const referringMember = referralCode
    ? await db.collection<MemberDoc>("members").findOne({
        $or: [{ membershipId: referralCode }, { id: Number(referralCode) || -1 }],
      })
    : null;
  const donation: DonationDoc = {
    id: await nextSequence("donations"),
    amount,
    donorName,
    donorEmail: donorEmail.trim().toLowerCase(),
    donorPhone: donorPhone || null,
    donorPan: donorPan || null,
    donorAddress: donorAddress || null,
    campaignId: body.campaignId ? Number(body.campaignId) : null,
    purpose: body.purpose,
    receiptNumber: generateReceiptNumber(),
    status: "paid",
    referral: referringMember
      ? {
          code: referralCode,
          memberId: referringMember.id,
          membershipId: referringMember.membershipId,
          memberName: referringMember.name,
          referredAt: new Date(),
        }
      : null,
    payment: {
      mode: body.paymentMode || "cash",
      status: "paid",
      amount,
      currency: "INR",
      receipt: body.paymentReference || undefined,
      paidAt: new Date(),
      createdAt: new Date(),
    },
    createdAt: new Date(),
  };

  await db.collection<DonationDoc>("donations").insertOne(donation);

  if (donation.campaignId) {
    await db.collection("campaigns").updateOne(
      { id: donation.campaignId },
      { $inc: { raisedAmount: amount, donorCount: 1 } },
    );
  }

  if (donation.referral) {
    await issueReferralAchievementIfEligible(db, donation.referral.memberId, req.url);
  }

  let emailSent = true;
  try {
    await sendDonationReceiptEmail(donation, req.url);
  } catch (emailError) {
    emailSent = false;
    console.error("Donation receipt email failed:", emailError);
  }

  return NextResponse.json({ donation: toResponse(donation), emailSent }, { status: 201 });
}
