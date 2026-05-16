import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardPanel } from "@/components/admin/dashboard-panel";
import { getDb } from "@/lib/db";
import type { CampaignDoc, DonationDoc, GalleryDoc, MemberDoc, NewsDoc } from "@/lib/types";

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
  const campaignTitleById = new Map(campaignRows.map((campaign) => [campaign.id, campaign.title]));

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
    createdAt: item.createdAt.toISOString(),
  }));

  const initialMembers = memberRows.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    address: item.address,
    city: item.city,
    state: item.state,
    membershipType: item.membershipType,
    membershipId: item.membershipId,
    status: item.status,
    certificateNumber: item.certificateNumber,
    joinedAt: item.joinedAt.toISOString(),
  }));

  const initialDonations = donationRows.map((item) => ({
    id: item.id,
    amount: item.amount,
    donorName: item.donorName,
    donorEmail: item.donorEmail,
    donorPhone: item.donorPhone ?? null,
    campaignId: item.campaignId ?? null,
    campaignTitle: item.campaignId ? campaignTitleById.get(item.campaignId) ?? null : null,
    purpose: item.purpose,
    receiptNumber: item.receiptNumber,
    status: item.status ?? "paid",
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
    category: item.category,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <DashboardPanel
          email={session.adminEmail}
          initialNews={initialNews}
          initialCampaigns={initialCampaigns}
          initialMembers={initialMembers}
          initialDonations={initialDonations}
          initialGallery={initialGallery}
        />
      </div>
    </main>
  );
}
