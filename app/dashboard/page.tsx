import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardPanel } from "@/components/admin/dashboard-panel";
import { getDb } from "@/lib/db";
import { getReceiptIdentity } from "@/lib/receipt-documents";
import type {
  CampaignDoc,
  DonationDoc,
  EnquiryDoc,
  GalleryDoc,
  MemberDoc,
  NewsDoc,
  VisitorCertificateDoc,
} from "@/lib/types";

function paidDonation(donation: DonationDoc) {
  return donation.status === "paid" || donation.payment?.status === "paid" || !donation.payment;
}

function membershipReceiptAvailable(member: MemberDoc) {
  return member.payment?.status === "paid" || member.status === "active";
}

function normalizeEmail(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function serializeReferralAchievement(member: MemberDoc) {
  if (!member.referralAchievement) return null;

  return {
    ...member.referralAchievement,
    issuedAt: member.referralAchievement.issuedAt.toISOString(),
    updatedAt: member.referralAchievement.updatedAt?.toISOString() ?? null,
    lastEmailSentAt: member.referralAchievement.lastEmailSentAt?.toISOString() ?? null,
  };
}

function serializeEnquiry(enquiry: EnquiryDoc) {
  return {
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    message: enquiry.message,
    status: enquiry.status ?? "new",
    autoResponseSent: enquiry.autoResponseSent ?? false,
    autoResponseSentAt: enquiry.autoResponseSentAt?.toISOString() ?? null,
    replies: (enquiry.replies ?? []).map((reply) => ({
      ...reply,
      sentAt: reply.sentAt.toISOString(),
    })),
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt?.toISOString() ?? null,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    redirect("/login");
  }

  const db = await getDb();
  const newsRows = await db.collection<NewsDoc>("news").find({}).sort({ publishedAt: -1 }).toArray();
  const campaignRows = await db.collection<CampaignDoc>("campaigns").find({}).sort({ createdAt: -1 }).toArray();
  const memberRows = await db.collection<MemberDoc>("members").find({}).sort({ joinedAt: -1 }).toArray();
  const donationRows = await db.collection<DonationDoc>("donations").find({}).sort({ createdAt: -1 }).toArray();
  const galleryRows = await db.collection<GalleryDoc>("gallery").find({}).sort({ createdAt: -1 }).toArray();
  const visitorCertificateRows = await db.collection<VisitorCertificateDoc>("visitorCertificates").find({}).sort({ createdAt: -1 }).toArray();
  const enquiryRows = await db.collection<EnquiryDoc>("contacts").find({}).sort({ createdAt: -1 }).toArray();
  const campaignTitleById = new Map(campaignRows.map((campaign) => [campaign.id, campaign.title]));
  const memberDonationStats = new Map<string, { count: number; amount: number }>();
  donationRows.filter(paidDonation).forEach((donation) => {
    const email = normalizeEmail(donation.donorEmail);
    if (!email) return;
    const existing = memberDonationStats.get(email) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += donation.amount;
    memberDonationStats.set(email, existing);
  });

  const initialNews = newsRows.map((item) => ({
    id: item.id,
    title: item.title,
    titleHindi: item.titleHindi,
    content: item.content,
    contentHindi: item.contentHindi,
    excerpt: item.excerpt,
    imageUrl: item.imageUrl,
    category: item.category,
    author: item.author,
    publishedAt: item.publishedAt.toISOString(),
  }));

  const initialCampaigns = campaignRows.map((item) => ({
    id: item.id,
    title: item.title,
    titleHindi: item.titleHindi,
    description: item.description,
    descriptionHindi: item.descriptionHindi,
    goalAmount: item.goalAmount,
    raisedAmount: item.raisedAmount,
    category: item.category,
    imageUrl: item.imageUrl,
    isActive: item.isActive,
    donorCount: item.donorCount,
    startDate: item.startDate?.toISOString() ?? null,
    endDate: item.endDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  const initialMembers = memberRows.map((item) => {
    const donationStats = memberDonationStats.get(normalizeEmail(item.email)) ?? { count: 0, amount: 0 };
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      dateOfBirth: item.dateOfBirth ?? null,
      address: item.address,
      city: item.city,
      state: item.state,
      membershipType: item.membershipType,
      membershipId: item.membershipId,
      status: item.status,
      certificateNumber: item.certificateNumber,
      referral: item.referral
        ? {
            ...item.referral,
            referredAt: item.referral.referredAt.toISOString(),
          }
        : null,
      donationAmount: donationStats.amount,
      donationCount: donationStats.count,
      joinedAt: item.joinedAt.toISOString(),
    };
  });

  const initialDonations = donationRows.map((item) => ({
    id: item.id,
    amount: item.amount,
    donorName: item.donorName,
    donorEmail: item.donorEmail,
    donorPhone: item.donorPhone ?? null,
    donorPan: item.donorPan ?? null,
    donorAddress: item.donorAddress ?? null,
    campaignId: item.campaignId ?? null,
    campaignTitle: item.campaignId ? campaignTitleById.get(item.campaignId) ?? null : null,
    purpose: item.purpose,
    receiptNumber: item.receiptNumber,
    status: item.status ?? "paid",
    referral: item.referral
      ? {
          ...item.referral,
          referredAt: item.referral.referredAt.toISOString(),
        }
      : null,
    paymentMode: item.payment?.mode ?? "manual",
    paymentStatus: item.payment?.status ?? "paid",
    orderId: item.payment?.orderId ?? null,
    paymentId: item.payment?.paymentId ?? null,
    razorpayReceipt: item.payment?.receipt ?? null,
    paidAt: item.payment?.paidAt ? item.payment.paidAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  }));

  const initialGallery = galleryRows.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    caption: item.caption,
    captionHindi: item.captionHindi,
    detailsEn: item.detailsEn,
    detailsHi: item.detailsHi,
    category: item.category,
    createdAt: item.createdAt.toISOString(),
  }));

  const initialVisitorCertificates = visitorCertificateRows.map((item) => ({
    id: item.id,
    certificateNumber: item.certificateNumber,
    recipientName: item.recipientName,
    recipientEmail: item.recipientEmail,
    recipientPhone: item.recipientPhone,
    title: item.title,
    description: item.description,
    eventName: item.eventName,
    issuedBy: item.issuedBy,
    templateId: item.templateId,
    status: item.status,
    issuedAt: item.issuedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  }));

  const membershipReferralCounts = new Map<number, number>();
  memberRows.forEach((member) => {
    if (member.referral) {
      membershipReferralCounts.set(member.referral.memberId, (membershipReferralCounts.get(member.referral.memberId) ?? 0) + 1);
    }
  });

  const donationReferralStats = new Map<number, { count: number; amount: number }>();
  donationRows.filter(paidDonation).forEach((donation) => {
    if (!donation.referral) return;
    const existing = donationReferralStats.get(donation.referral.memberId) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += donation.amount;
    donationReferralStats.set(donation.referral.memberId, existing);
  });

  const initialReferralRows = memberRows
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
        referralAchievement: serializeReferralAchievement(member),
      };
    })
    .sort((a, b) => b.donationAmount - a.donationAmount || b.membershipReferrals - a.membershipReferrals);

  const initialMembershipReceipts = memberRows.filter(membershipReceiptAvailable).map((member) => {
    const receipt = getReceiptIdentity("membership", member);
    return {
      id: member.id,
      memberName: member.name,
      memberEmail: member.email,
      membershipId: member.membershipId,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      status: receipt.status,
      paymentMode: receipt.paymentMode,
      paidAt: new Date(receipt.paidAt).toISOString(),
    };
  });

  const initialDonationReceipts = donationRows.filter(paidDonation).map((donation) => {
    const receipt = getReceiptIdentity("donation", donation);
    return {
      id: donation.id,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      status: receipt.status,
      paymentMode: receipt.paymentMode,
      purpose: donation.purpose,
      paidAt: new Date(receipt.paidAt).toISOString(),
    };
  });

  const initialEnquiries = enquiryRows.map(serializeEnquiry);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <DashboardPanel
          email={session.adminEmail}
          initialNews={initialNews}
          initialCampaigns={initialCampaigns}
          initialMembers={initialMembers}
          initialDonations={initialDonations}
          initialGallery={initialGallery}
          initialVisitorCertificates={initialVisitorCertificates}
          initialReferralRows={initialReferralRows}
          initialMembershipReceipts={initialMembershipReceipts}
          initialDonationReceipts={initialDonationReceipts}
          initialEnquiries={initialEnquiries}
        />
      </div>
    </main>
  );
}
