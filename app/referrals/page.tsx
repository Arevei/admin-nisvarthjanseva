import { redirect } from "next/navigation";
import { ReferralTrackingPanel } from "@/components/admin/referral-tracking-panel";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { DonationDoc, MemberDoc } from "@/lib/types";

function paidDonation(donation: DonationDoc) {
  return donation.status === "paid" || donation.payment?.status === "paid" || !donation.payment;
}

function serializeAchievement(member: MemberDoc) {
  if (!member.referralAchievement) return null;

  return {
    ...member.referralAchievement,
    issuedAt: member.referralAchievement.issuedAt.toISOString(),
    updatedAt: member.referralAchievement.updatedAt?.toISOString() ?? null,
    lastEmailSentAt: member.referralAchievement.lastEmailSentAt?.toISOString() ?? null,
  };
}

export default async function ReferralsPage() {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    redirect("/login");
  }

  const db = await getDb();
  const [members, donations] = await Promise.all([
    db.collection<MemberDoc>("members").find({}).sort({ joinedAt: -1 }).toArray(),
    db.collection<DonationDoc>("donations").find({}).toArray(),
  ]);

  const membershipReferralCounts = new Map<number, number>();
  members.forEach((member) => {
    if (member.referral) {
      membershipReferralCounts.set(member.referral.memberId, (membershipReferralCounts.get(member.referral.memberId) ?? 0) + 1);
    }
  });

  const donationReferralStats = new Map<number, { count: number; amount: number }>();
  donations.filter(paidDonation).forEach((donation) => {
    if (!donation.referral) return;
    const existing = donationReferralStats.get(donation.referral.memberId) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += donation.amount;
    donationReferralStats.set(donation.referral.memberId, existing);
  });

  const rows = members
    .map((member) => {
      const donationStats = donationReferralStats.get(member.id) ?? { count: 0, amount: 0 };
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        membershipId: member.membershipId,
        membershipReferrals: membershipReferralCounts.get(member.id) ?? 0,
        donationReferrals: donationStats.count,
        donationAmount: donationStats.amount,
        referralAchievement: serializeAchievement(member),
      };
    })
    .sort((a, b) => b.donationAmount - a.donationAmount || b.membershipReferrals - a.membershipReferrals);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <ReferralTrackingPanel initialRows={rows} />
      </div>
    </main>
  );
}
