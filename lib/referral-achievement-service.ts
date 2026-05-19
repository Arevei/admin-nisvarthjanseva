import type { Db } from "mongodb";
import { sendReferralAchievementEmail } from "@/lib/email";
import {
  generateReferralAchievementCertificateNumber,
  referralAchievementTiers,
  type ReferralAchievementMember,
} from "@/lib/referral-achievements";
import type { ReferralAchievement } from "@/lib/types";

function getTierForAmount(amount: number) {
  return [...referralAchievementTiers].reverse().find((tier) => amount >= tier.thresholdAmount) ?? null;
}

function getTierRank(tier: string | null | undefined) {
  return referralAchievementTiers.findIndex((item) => item.tier === tier);
}

async function getPaidReferralDonationTotal(db: Db, memberId: number) {
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

export async function issueReferralAchievementIfEligible(db: Db, memberId: number, requestUrl: string) {
  const donationAmount = await getPaidReferralDonationTotal(db, memberId);
  const tier = getTierForAmount(donationAmount);
  if (!tier) return null;

  const members = db.collection<ReferralAchievementMember>("members");
  const member = await members.findOne({ id: memberId });
  if (!member) return null;

  const current = member.referralAchievement;
  if (getTierRank(current?.tier) >= getTierRank(tier.tier)) {
    return current;
  }

  const now = new Date();
  const achievement: ReferralAchievement = {
    tier: tier.tier,
    certificateNumber: current?.certificateNumber || generateReferralAchievementCertificateNumber(tier.tier),
    donationAmount,
    thresholdAmount: tier.thresholdAmount,
    issuedAt: current?.issuedAt ? new Date(current.issuedAt) : now,
    updatedAt: now,
    source: "automatic",
    emailSent: false,
  };

  const updated = await members.findOneAndUpdate(
    { id: memberId },
    { $set: { referralAchievement: achievement } },
    { returnDocument: "after" },
  );

  if (!updated) return achievement;

  try {
    await sendReferralAchievementEmail(updated, requestUrl);
    await members.updateOne(
      { id: memberId },
      {
        $set: {
          "referralAchievement.emailSent": true,
          "referralAchievement.lastEmailSentAt": new Date(),
        },
      },
    );
  } catch (error) {
    console.error("Referral achievement email failed:", error);
  }

  return achievement;
}
