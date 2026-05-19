import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendReferralAchievementEmail } from "@/lib/email";
import {
  generateReferralAchievementCertificateNumber,
  referralAchievementTiers,
  type ReferralAchievementMember,
} from "@/lib/referral-achievements";
import { getSession } from "@/lib/session";
import type { MemberDoc, ReferralAchievement, ReferralAchievementTier } from "@/lib/types";

type Ctx = { params: Promise<{ memberId: string }> };
type UpdateBody = {
  tier?: ReferralAchievementTier | null;
};

async function getPaidReferralDonationTotal(memberId: number) {
  const db = await getDb();
  const rows = await db
    .collection("donations")
    .aggregate<{ total: number }>([
      {
        $match: {
          "referral.memberId": memberId,
          $or: [{ status: "paid" }, { "payment.status": "paid" }, { payment: { $exists: false } }],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    .toArray();

  return Number(rows[0]?.total ?? 0);
}

function toResponse(member: MemberDoc) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    membershipId: member.membershipId,
    referralAchievement: member.referralAchievement
      ? {
          ...member.referralAchievement,
          issuedAt: member.referralAchievement.issuedAt.toISOString(),
          updatedAt: member.referralAchievement.updatedAt?.toISOString() ?? null,
          lastEmailSentAt: member.referralAchievement.lastEmailSentAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const memberId = Number.parseInt((await params).memberId, 10);
  if (Number.isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  const body = (await req.json()) as UpdateBody;
  const tier = body.tier ?? null;
  const tierConfig = tier ? referralAchievementTiers.find((item) => item.tier === tier) : null;
  if (tier && !tierConfig) {
    return NextResponse.json({ error: "Invalid achievement tier" }, { status: 400 });
  }

  const db = await getDb();
  const members = db.collection<MemberDoc>("members");
  const member = await members.findOne({ id: memberId });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!tier || !tierConfig) {
    const updated = await members.findOneAndUpdate(
      { id: memberId },
      { $unset: { referralAchievement: "" } },
      { returnDocument: "after" },
    );
    return NextResponse.json({ member: updated ? toResponse(updated) : null, emailSent: false });
  }

  const donationAmount = await getPaidReferralDonationTotal(memberId);
  const now = new Date();
  const achievement: ReferralAchievement = {
    tier,
    certificateNumber:
      member.referralAchievement?.certificateNumber || generateReferralAchievementCertificateNumber(tier),
    donationAmount,
    thresholdAmount: tierConfig.thresholdAmount,
    issuedAt: member.referralAchievement?.issuedAt || now,
    updatedAt: now,
    source: "admin",
    emailSent: false,
  };

  const updated = await members.findOneAndUpdate(
    { id: memberId },
    { $set: { referralAchievement: achievement } },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Failed to update achievement" }, { status: 500 });
  }

  let emailSent = true;
  try {
    await sendReferralAchievementEmail(updated as ReferralAchievementMember, req.url);
    await members.updateOne(
      { id: memberId },
      {
        $set: {
          "referralAchievement.emailSent": true,
          "referralAchievement.lastEmailSentAt": new Date(),
        },
      },
    );
    const refreshed = await members.findOne({ id: memberId });
    return NextResponse.json({ member: refreshed ? toResponse(refreshed) : toResponse(updated), emailSent });
  } catch (error) {
    emailSent = false;
    console.error("Referral achievement email failed:", error);
  }

  return NextResponse.json({ member: toResponse(updated), emailSent });
}
