import type { Db } from "mongodb";
import { sendReferralAchievementEmail } from "@/lib/email";
import {
  generateReferralAchievementCertificateNumber,
  getReferralAchievementTier,
  referralAchievementTiers,
  type ReferralAchievementMember,
  type ReferralAchievementStats,
} from "@/lib/referral-achievements";
import type { ReferralAchievement } from "@/lib/types";

function getTierRank(tier: string | null | undefined) {
  return referralAchievementTiers.findIndex((item) => item.tier === tier);
}

export async function getReferralAchievementStats(db: Db, memberId: number): Promise<ReferralAchievementStats> {
  const [membershipReferralCount, donationRows] = await Promise.all([
    db.collection("members").countDocuments({ "referral.memberId": memberId }),
    db
      .collection("donations")
      .aggregate<{ count: number; total: number }>([
        {
          $match: {
            "referral.memberId": memberId,
            $or: [{ status: "paid" }, { "payment.status": "paid" }, { payment: { $exists: false } }],
          },
        },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ])
      .toArray(),
  ]);

  return {
    membershipReferralCount,
    donationReferralCount: Number(donationRows[0]?.count ?? 0),
    donationAmount: Number(donationRows[0]?.total ?? 0),
  };
}

export async function issueReferralAchievementIfEligible(db: Db, memberId: number, requestUrl: string) {
  const stats = await getReferralAchievementStats(db, memberId);
  const tier = getReferralAchievementTier(stats);
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
    membershipReferralCount: stats.membershipReferralCount,
    donationReferralCount: stats.donationReferralCount,
    donationAmount: stats.donationAmount,
    requiredMembershipReferrals: tier.membershipReferralCount,
    requiredDonationReferrals: tier.donationReferralCount,
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
