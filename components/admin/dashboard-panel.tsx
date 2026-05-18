"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { CloudinaryUpload } from "@/components/admin/cloudinary-upload";

type Tab = "members" | "donations" | "news" | "campaigns" | "gallery" | "visitorCertificates";

type MemberItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  membershipType: "general" | "active" | "lifetime";
  membershipId: string;
  status: string;
  certificateNumber: string | null;
  referral: ReferralInfo | null;
  joinedAt: string;
};

type ReferralInfo = {
  code: string;
  memberId: number;
  membershipId: string;
  memberName: string;
  referredAt: string;
};

type NewsItem = {
  id: number;
  title: string;
  titleHindi: string | null;
  content: string;
  contentHindi: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  category: string;
  author: string | null;
  publishedAt: string;
};

type CampaignItem = {
  id: number;
  title: string;
  titleHindi: string | null;
  description: string;
  descriptionHindi: string | null;
  goalAmount: number;
  raisedAmount: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  donorCount: number;
  createdAt: string;
};

type DonationItem = {
  id: number;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone: string | null;
  campaignId: number | null;
  campaignTitle: string | null;
  purpose: string;
  receiptNumber: string;
  status: string;
  referral: ReferralInfo | null;
  paymentMode: string;
  paymentStatus: string;
  orderId: string | null;
  paymentId: string | null;
  razorpayReceipt: string | null;
  paidAt: string | null;
  createdAt: string;
};

type GalleryItem = {
  id: number;
  imageUrl: string;
  caption: string | null;
  captionHindi: string | null;
  detailsEn: string | null;
  detailsHi: string | null;
  category: string;
  createdAt: string;
};

type VisitorCertificateItem = {
  id: number;
  certificateNumber: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  title: string;
  description: string;
  eventName: string | null;
  issuedBy: string | null;
  templateId: "classic" | "heritage" | "service" | "impact" | "appreciation" | "modern";
  status: "issued" | "revoked";
  issuedAt: string;
  createdAt: string;
};

const campaignCategories = ["education", "health", "environment", "women", "rural", "disaster", "general"];
const newsCategories = ["general", "health", "education", "environment", "women", "rural"];
const galleryCategories = ["events", "education", "health", "environment", "women", "rural", "donation", "general"];
const donationPaymentModes = ["cash", "upi", "bank_transfer", "other", "manual"] as const;
const visitorCertificateTemplates: Array<{ id: VisitorCertificateItem["templateId"]; name: string; tone: string }> = [
  { id: "classic", name: "Classic Red", tone: "border-rose-300 bg-rose-50 text-rose-800" },
  { id: "heritage", name: "Heritage Gold", tone: "border-amber-300 bg-amber-50 text-amber-800" },
  { id: "service", name: "Service Green", tone: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  { id: "impact", name: "Impact Blue", tone: "border-blue-300 bg-blue-50 text-blue-800" },
  { id: "appreciation", name: "Appreciation Plum", tone: "border-purple-300 bg-purple-50 text-purple-800" },
  { id: "modern", name: "Modern Slate", tone: "border-slate-300 bg-slate-50 text-slate-800" },
];

const membershipTypeLabel: Record<MemberItem["membershipType"], string> = {
  general: "General",
  active: "Active",
  lifetime: "Lifetime",
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "issued") return "bg-emerald-100 text-emerald-800";
  if (status === "revoked") return "bg-rose-100 text-rose-800";
  if (status === "created") return "bg-amber-100 text-amber-800";
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "payment_pending") return "bg-amber-100 text-amber-800";
  if (status === "pending") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-rose-100 text-rose-800";
  if (status === "suspended") return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-700";
}

function money(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function shortDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPanel({
  email,
  initialNews,
  initialCampaigns,
  initialMembers,
  initialDonations,
  initialGallery,
  initialVisitorCertificates,
}: {
  email: string;
  initialNews: NewsItem[];
  initialCampaigns: CampaignItem[];
  initialMembers: MemberItem[];
  initialDonations: DonationItem[];
  initialGallery: GalleryItem[];
  initialVisitorCertificates: VisitorCertificateItem[];
}) {
  const router = useRouter();
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [tab, setTab] = useState<Tab>("members");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [donations, setDonations] = useState<DonationItem[]>(initialDonations);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [visitorCertificates, setVisitorCertificates] = useState<VisitorCertificateItem[]>(initialVisitorCertificates);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
  const [expandedDonationId, setExpandedDonationId] = useState<number | null>(null);

  const [newsForm, setNewsForm] = useState({
    title: "",
    titleHindi: "",
    content: "",
    contentHindi: "",
    excerpt: "",
    imageUrl: "",
    category: "general",
    author: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    title: "",
    titleHindi: "",
    description: "",
    descriptionHindi: "",
    goalAmount: "",
    category: "general",
    imageUrl: "",
    isActive: true,
  });

  const [galleryForm, setGalleryForm] = useState({
    imageUrl: "",
    caption: "",
    captionHindi: "",
    detailsEn: "",
    detailsHi: "",
    category: "events",
  });

  const [donationForm, setDonationForm] = useState({
    amount: "",
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    campaignId: "",
    purpose: "General Donation",
    paymentMode: "cash" as (typeof donationPaymentModes)[number],
    paymentReference: "",
    referralCode: "",
  });

  const [visitorCertificateForm, setVisitorCertificateForm] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    title: "Certificate of Appreciation",
    description: "For valuable presence, support, and contribution to Nisvarthjan Seva Foundation activities.",
    eventName: "",
    issuedBy: "Nisvarthjan Seva Foundation",
    templateId: "classic" as VisitorCertificateItem["templateId"],
  });

  const pendingMembers = useMemo(
    () => members.filter((member) => member.status === "pending"),
    [members],
  );
  const paymentPendingMembers = useMemo(
    () => members.filter((member) => member.status === "payment_pending"),
    [members],
  );
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members],
  );
  const paidDonations = useMemo(
    () => donations.filter((donation) => donation.paymentStatus === "paid" || !donation.paymentStatus),
    [donations],
  );
  const totalDonationAmount = useMemo(
    () => paidDonations.reduce((total, donation) => total + donation.amount, 0),
    [paidDonations],
  );
  const referralStats = useMemo(() => {
    const stats = new Map<
      number,
      { memberName: string; membershipId: string; membershipReferrals: number; donationReferrals: number; donationAmount: number }
    >();

    const ensureStat = (referral: ReferralInfo) => {
      const existing = stats.get(referral.memberId);
      if (existing) return existing;

      const created = {
        memberName: referral.memberName,
        membershipId: referral.membershipId,
        membershipReferrals: 0,
        donationReferrals: 0,
        donationAmount: 0,
      };
      stats.set(referral.memberId, created);
      return created;
    };

    members.forEach((member) => {
      if (member.referral) {
        ensureStat(member.referral).membershipReferrals += 1;
      }
    });

    paidDonations.forEach((donation) => {
      if (donation.referral) {
        const stat = ensureStat(donation.referral);
        stat.donationReferrals += 1;
        stat.donationAmount += donation.amount;
      }
    });

    return Array.from(stats.values()).sort(
      (a, b) => b.membershipReferrals + b.donationReferrals - (a.membershipReferrals + a.donationReferrals),
    );
  }, [members, paidDonations]);

  const refreshAll = async () => {
    setError("");
    const [membersRes, newsRes, campaignsRes, donationsRes, galleryRes, visitorCertificatesRes] = await Promise.all([
      fetch("/api/members", { credentials: "include" }),
      fetch("/api/news", { credentials: "include" }),
      fetch("/api/campaigns", { credentials: "include" }),
      fetch("/api/donations", { credentials: "include" }),
      fetch("/api/gallery", { credentials: "include" }),
      fetch("/api/visitor-certificates", { credentials: "include" }),
    ]);
    if (!membersRes.ok || !newsRes.ok || !campaignsRes.ok || !donationsRes.ok || !galleryRes.ok || !visitorCertificatesRes.ok) {
      throw new Error("Failed to refresh dashboard data");
    }
    const membersData = (await membersRes.json()) as MemberItem[];
    const newsData = (await newsRes.json()) as NewsItem[];
    const campaignsData = (await campaignsRes.json()) as CampaignItem[];
    const donationsData = (await donationsRes.json()) as DonationItem[];
    const galleryData = (await galleryRes.json()) as GalleryItem[];
    const visitorCertificatesData = (await visitorCertificatesRes.json()) as VisitorCertificateItem[];
    setMembers(membersData);
    setNews(newsData);
    setCampaigns(campaignsData);
    setDonations(donationsData);
    setGallery(galleryData);
    setVisitorCertificates(visitorCertificatesData);
  };

  const refreshQueue = async () => {
    try {
      await refreshAll();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh queue");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  const memberAction = async (
    memberId: number,
    action: "approve" | "activate" | "reject" | "suspend",
  ) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as {
        error?: string;
        member?: MemberItem;
      };

      if (!response.ok && response.status !== 207) {
        throw new Error(payload.error || "Failed to update member");
      }

      if (response.status === 207 && payload.error) {
        setError(payload.error);
      }

      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update member");
    } finally {
      setBusy(false);
    }
  };

  const submitNews = async () => {
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      setError("News title and content are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newsForm,
          excerpt: newsForm.excerpt || stripHtml(newsForm.content).slice(0, 160),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to create news");
      }

      setNewsForm({
        title: "",
        titleHindi: "",
        content: "",
        contentHindi: "",
        excerpt: "",
        imageUrl: "",
        category: "general",
        author: "",
      });
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create news");
    } finally {
      setBusy(false);
    }
  };

  const removeNews = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete news");
      }
      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete news");
    } finally {
      setBusy(false);
    }
  };

  const submitCampaign = async () => {
    if (!campaignForm.title.trim() || !campaignForm.description.trim() || !campaignForm.goalAmount.trim()) {
      setError("Campaign title, description and goal amount are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...campaignForm,
          goalAmount: Number(campaignForm.goalAmount),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to create campaign");
      }

      setCampaignForm({
        title: "",
        titleHindi: "",
        description: "",
        descriptionHindi: "",
        goalAmount: "",
        category: "general",
        imageUrl: "",
        isActive: true,
      });
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  };

  const updateCampaign = async (campaign: CampaignItem) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(campaign),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update campaign");
      }

      setEditingCampaignId(null);
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update campaign");
    } finally {
      setBusy(false);
    }
  };

  const resetGalleryForm = () => {
    setGalleryForm({
      imageUrl: "",
      caption: "",
      captionHindi: "",
      detailsEn: "",
      detailsHi: "",
      category: "events",
    });
    setEditingGalleryId(null);
  };

  const submitGallery = async () => {
    if (!galleryForm.imageUrl.trim()) {
      setError("Gallery image is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(galleryForm),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to add gallery image");
      }

      resetGalleryForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to add gallery image");
    } finally {
      setBusy(false);
    }
  };

  const updateGallery = async () => {
    if (!editingGalleryId) return;
    if (!galleryForm.imageUrl.trim()) {
      setError("Gallery image is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/gallery/${editingGalleryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(galleryForm),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update gallery image");
      }

      resetGalleryForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update gallery image");
    } finally {
      setBusy(false);
    }
  };

  const removeGallery = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete gallery image");
      }

      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete gallery image");
    } finally {
      setBusy(false);
    }
  };

  const resetDonationForm = () => {
    setDonationForm({
      amount: "",
      donorName: "",
      donorEmail: "",
      donorPhone: "",
      campaignId: "",
      purpose: "General Donation",
      paymentMode: "cash",
      paymentReference: "",
      referralCode: "",
    });
  };

  const submitManualDonation = async () => {
    if (!donationForm.amount.trim() || !donationForm.donorName.trim() || !donationForm.donorEmail.trim() || !donationForm.purpose.trim()) {
      setError("Amount, donor name, donor email and purpose are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Number(donationForm.amount),
          donorName: donationForm.donorName,
          donorEmail: donationForm.donorEmail,
          donorPhone: donationForm.donorPhone,
          campaignId: donationForm.campaignId ? Number(donationForm.campaignId) : null,
          purpose: donationForm.purpose,
          paymentMode: donationForm.paymentMode,
          paymentReference: donationForm.paymentReference,
          referralCode: donationForm.referralCode || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; emailSent?: boolean };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to record donation");
      }
      if (payload.emailSent === false) {
        setError("Donation recorded, but receipt email failed. Check SMTP settings.");
      }
      resetDonationForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to record donation");
    } finally {
      setBusy(false);
    }
  };

  const resetVisitorCertificateForm = () => {
    setVisitorCertificateForm({
      recipientName: "",
      recipientEmail: "",
      recipientPhone: "",
      title: "Certificate of Appreciation",
      description: "For valuable presence, support, and contribution to Nisvarthjan Seva Foundation activities.",
      eventName: "",
      issuedBy: "Nisvarthjan Seva Foundation",
      templateId: "classic",
    });
  };

  const issueVisitorCertificate = async () => {
    if (
      !visitorCertificateForm.recipientName.trim() ||
      !visitorCertificateForm.recipientEmail.trim() ||
      !visitorCertificateForm.title.trim() ||
      !visitorCertificateForm.description.trim()
    ) {
      setError("Recipient name, email, certificate title and description are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/visitor-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(visitorCertificateForm),
      });
      const payload = (await response.json()) as { error?: string; emailSent?: boolean };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to issue visitor certificate");
      }
      if (payload.emailSent === false) {
        setError("Certificate issued, but email delivery failed. Check SMTP settings.");
      }

      resetVisitorCertificateForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to issue visitor certificate");
    } finally {
      setBusy(false);
    }
  };

  const updateVisitorCertificateStatus = async (id: number, status: VisitorCertificateItem["status"]) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/visitor-certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update certificate");
      }
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update certificate");
    } finally {
      setBusy(false);
    }
  };

  const removeVisitorCertificate = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/visitor-certificates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete certificate");
      }
      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete certificate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-700 via-rose-700 to-orange-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Complete Admin Control
            </p>
            <h1 className="mt-3 text-3xl font-bold">Nisvarthjan Command Center</h1>
            <p className="mt-1 text-sm text-rose-100">Logged in as {email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Reviews</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{pendingMembers.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Awaiting Payment</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{paymentPendingMembers.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Active Members</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{activeMembers.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Live Campaigns</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{campaigns.filter((c) => c.isActive).length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Donation Amount</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totalDonationAmount)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "members" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("members")}
        >
          Members
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "donations" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("donations")}
        >
          Donations
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "news" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("news")}
        >
          News
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "campaigns" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("campaigns")}
        >
          Campaigns
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "gallery" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("gallery")}
        >
          Gallery
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === "visitorCertificates" ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
          onClick={() => setTab("visitorCertificates")}
        >
          Visitor Certificates
        </button>
      </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {tab === "members" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900">Membership Approval Queue</h2>
              <button
                type="button"
                onClick={refreshQueue}
                className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
              >
                Refresh Queue
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Approve new registrations, automatically send payment QR email, and activate after manual payment confirmation.
            </p>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900">{member.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(member.status)}`}>
                        {member.status}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                        {membershipTypeLabel[member.membershipType]}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600">{member.email} | {member.phone}</p>
                    <p className="text-xs text-zinc-500">
                      {member.membershipId} | Joined {new Date(member.joinedAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      DOB: {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-IN") : "Not provided"}
                      {member.referral ? ` | Referred by ${member.referral.memberName} (${member.referral.membershipId})` : " | Direct registration"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {member.status === "pending" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => memberAction(member.id, "approve")}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                      >
                        Approve & Send QR
                      </button>
                    )}
                    {member.status === "payment_pending" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => memberAction(member.id, "activate")}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Activate (Payment Received)
                      </button>
                    )}
                    {member.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => memberAction(member.id, "reject")}
                        className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    )}
                    {member.status === "active" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => memberAction(member.id, "suspend")}
                        className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
                No membership records found.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "donations" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Donation Payments</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  View every donation payment, Razorpay reference, campaign link, and receipt details.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshQueue}
                className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
              >
                Refresh Donations
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900">Record Cash / Manual Donation</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Create QR-coded receipts for cash, UPI, bank transfer, or other offline donations. The PDF receipt is emailed automatically.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Amount *</label>
                <input type="number" value={donationForm.amount} onChange={(e) => setDonationForm((p) => ({ ...p, amount: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Donor Name *</label>
                <input value={donationForm.donorName} onChange={(e) => setDonationForm((p) => ({ ...p, donorName: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Donor Email *</label>
                <input type="email" value={donationForm.donorEmail} onChange={(e) => setDonationForm((p) => ({ ...p, donorEmail: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Donor Phone</label>
                <input value={donationForm.donorPhone} onChange={(e) => setDonationForm((p) => ({ ...p, donorPhone: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Mode</label>
                <select value={donationForm.paymentMode} onChange={(e) => setDonationForm((p) => ({ ...p, paymentMode: e.target.value as typeof donationForm.paymentMode }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                  {donationPaymentModes.map((mode) => (
                    <option key={mode} value={mode}>{mode.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Campaign</label>
                <select value={donationForm.campaignId} onChange={(e) => setDonationForm((p) => ({ ...p, campaignId: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                  <option value="">General donation</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Purpose *</label>
                <input value={donationForm.purpose} onChange={(e) => setDonationForm((p) => ({ ...p, purpose: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Reference</label>
                <input value={donationForm.paymentReference} onChange={(e) => setDonationForm((p) => ({ ...p, paymentReference: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Referral Membership ID</label>
                <input value={donationForm.referralCode} onChange={(e) => setDonationForm((p) => ({ ...p, referralCode: e.target.value.toUpperCase() }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="NSF-2026-12345" />
              </div>
            </div>
            <button type="button" onClick={submitManualDonation} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Saving..." : "Generate & Email Receipt"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Paid Donations</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{paidDonations.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total Received</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totalDonationAmount)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Orders</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">
                {donations.filter((donation) => donation.paymentStatus !== "paid").length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Referral Tracking</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Membership registrations and paid donations attributed to member referral links.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                {referralStats.length} referring members
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <div className="grid grid-cols-4 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <span>Member</span>
                <span>Membership Referrals</span>
                <span>Donation Referrals</span>
                <span>Donation Collection</span>
              </div>
              {referralStats.map((stat) => (
                <div key={stat.membershipId} className="grid grid-cols-4 gap-3 border-t border-zinc-200 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-zinc-900">{stat.memberName}</p>
                    <p className="text-xs text-zinc-500">{stat.membershipId}</p>
                  </div>
                  <p className="text-zinc-800">{stat.membershipReferrals}</p>
                  <p className="text-zinc-800">{stat.donationReferrals}</p>
                  <p className="font-semibold text-zinc-900">{money(stat.donationAmount)}</p>
                </div>
              ))}
              {referralStats.length === 0 && (
                <div className="border-t border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  No referral activity tracked yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {donations.map((donation) => {
              const expanded = expandedDonationId === donation.id;
              return (
                <div key={donation.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900">{donation.donorName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(donation.paymentStatus)}`}>
                          {donation.paymentStatus}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                          {donation.paymentMode}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">{donation.donorEmail} | {money(donation.amount)}</p>
                      <p className="text-xs text-zinc-500">
                        {donation.receiptNumber} | {shortDate(donation.paidAt || donation.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {donation.campaignTitle ? `Campaign: ${donation.campaignTitle}` : `Purpose: ${donation.purpose}`}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {donation.referral ? `Referral: ${donation.referral.memberName} (${donation.referral.membershipId})` : "Referral: Direct donation"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedDonationId(expanded ? null : donation.id)}
                        className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                      >
                        {expanded ? "Hide Details" : "View Details"}
                      </button>
                      <a
                        href={`/api/donations/${donation.id}/receipt`}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Download Receipt
                      </a>
                      <a
                        href={`${publicSiteUrl}/verify?certificateNumber=${encodeURIComponent(donation.receiptNumber)}&documentType=donation-receipt`}
                        target="_blank"
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Verify
                      </a>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <h4 className="text-sm font-semibold text-zinc-900">Donation Detail</h4>
                        <dl className="mt-3 grid gap-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Donor phone</dt>
                            <dd className="text-right text-zinc-800">{donation.donorPhone || "Not provided"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Purpose</dt>
                            <dd className="text-right text-zinc-800">{donation.purpose}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Campaign ID</dt>
                            <dd className="text-right text-zinc-800">{donation.campaignId || "General donation"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Created</dt>
                            <dd className="text-right text-zinc-800">{shortDate(donation.createdAt)}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Referral</dt>
                            <dd className="text-right text-zinc-800">
                              {donation.referral ? `${donation.referral.memberName} (${donation.referral.membershipId})` : "Direct donation"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                        <h4 className="text-sm font-semibold text-zinc-900">Receipt</h4>
                        <div className="mt-3 rounded-md border border-rose-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Receipt Number</p>
                          <p className="mt-1 break-all font-mono text-sm font-semibold text-rose-700">{donation.receiptNumber}</p>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Razorpay order</dt>
                            <dd className="break-all text-right text-zinc-800">{donation.orderId || "Not available"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Payment ID</dt>
                            <dd className="break-all text-right text-zinc-800">{donation.paymentId || "Not available"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Paid at</dt>
                            <dd className="text-right text-zinc-800">{donation.paidAt ? shortDate(donation.paidAt) : "Not paid yet"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Razorpay receipt</dt>
                            <dd className="break-all text-right text-zinc-800">{donation.razorpayReceipt || "Not available"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {donations.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
                No donation payments found.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900">Create News</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (English)</label>
                <input value={newsForm.title} onChange={(e) => setNewsForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (Hindi)</label>
                <input value={newsForm.titleHindi} onChange={(e) => setNewsForm((p) => ({ ...p, titleHindi: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Category</label>
                <select value={newsForm.category} onChange={(e) => setNewsForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                  {newsCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Author</label>
                <input value={newsForm.author} onChange={(e) => setNewsForm((p) => ({ ...p, author: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-4">
              <CloudinaryUpload value={newsForm.imageUrl} onChange={(imageUrl) => setNewsForm((p) => ({ ...p, imageUrl }))} label="Feature Image" />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Excerpt (optional)</label>
              <textarea value={newsForm.excerpt} onChange={(e) => setNewsForm((p) => ({ ...p, excerpt: e.target.value }))} className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Content (English)</label>
              <RichTextEditor value={newsForm.content} onChange={(content) => setNewsForm((p) => ({ ...p, content }))} placeholder="Write english content..." />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Content (Hindi)</label>
              <RichTextEditor value={newsForm.contentHindi} onChange={(contentHindi) => setNewsForm((p) => ({ ...p, contentHindi }))} placeholder="Write hindi content..." />
            </div>

            <button type="button" onClick={submitNews} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Saving..." : "Publish News"}
            </button>
          </div>

          <div className="space-y-3">
            {news.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500">
                      {item.category} | {new Date(item.publishedAt).toLocaleDateString()}
                    </p>
                    <h3 className="truncate text-base font-semibold text-zinc-900">{item.title}</h3>
                    <p className="line-clamp-2 text-sm text-zinc-600">{stripHtml(item.content)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNews(item.id)}
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900">Create Campaign</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (English)</label>
                <input value={campaignForm.title} onChange={(e) => setCampaignForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (Hindi)</label>
                <input value={campaignForm.titleHindi} onChange={(e) => setCampaignForm((p) => ({ ...p, titleHindi: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Category</label>
                <select value={campaignForm.category} onChange={(e) => setCampaignForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                  {campaignCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Goal Amount (INR)</label>
                <input type="number" value={campaignForm.goalAmount} onChange={(e) => setCampaignForm((p) => ({ ...p, goalAmount: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-4">
              <CloudinaryUpload value={campaignForm.imageUrl} onChange={(imageUrl) => setCampaignForm((p) => ({ ...p, imageUrl }))} label="Campaign Image" />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Description (English)</label>
              <RichTextEditor value={campaignForm.description} onChange={(description) => setCampaignForm((p) => ({ ...p, description }))} placeholder="Write campaign description..." />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Description (Hindi)</label>
              <RichTextEditor value={campaignForm.descriptionHindi} onChange={(descriptionHindi) => setCampaignForm((p) => ({ ...p, descriptionHindi }))} placeholder="Write hindi description..." />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" checked={campaignForm.isActive} onChange={(e) => setCampaignForm((p) => ({ ...p, isActive: e.target.checked }))} />
              <span className="text-sm text-zinc-700">Campaign active</span>
            </div>

            <button type="button" onClick={submitCampaign} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Saving..." : "Create Campaign"}
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500">{item.category} | Goal Rs {item.goalAmount.toLocaleString("en-IN")}</p>
                    <h3 className="truncate text-base font-semibold text-zinc-900">{item.title}</h3>
                    <p className="line-clamp-2 text-sm text-zinc-600">{stripHtml(item.description)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCampaignId(item.id);
                        setCampaignForm({
                          title: item.title,
                          titleHindi: item.titleHindi || "",
                          description: item.description,
                          descriptionHindi: item.descriptionHindi || "",
                          goalAmount: String(item.goalAmount),
                          category: item.category,
                          imageUrl: item.imageUrl || "",
                          isActive: item.isActive,
                        });
                      }}
                      className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                    >
                      Edit
                    </button>
                    {editingCampaignId === item.id && (
                      <button
                        type="button"
                        onClick={() =>
                          updateCampaign({
                            ...item,
                            ...campaignForm,
                            titleHindi: campaignForm.titleHindi || null,
                            descriptionHindi: campaignForm.descriptionHindi || null,
                            imageUrl: campaignForm.imageUrl || null,
                            goalAmount: Number(campaignForm.goalAmount),
                          })
                        }
                        className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                      >
                        Save Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "gallery" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {editingGalleryId ? "Edit Gallery Event" : "Add Gallery Event"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  These images appear on the public gallery page and the home page gallery highlights.
                </p>
              </div>
              {editingGalleryId && (
                <button
                  type="button"
                  onClick={resetGalleryForm}
                  className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-4">
              <CloudinaryUpload value={galleryForm.imageUrl} onChange={(imageUrl) => setGalleryForm((p) => ({ ...p, imageUrl }))} label="Gallery Image" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Caption (English)</label>
                <input value={galleryForm.caption} onChange={(e) => setGalleryForm((p) => ({ ...p, caption: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Caption (Hindi)</label>
                <input value={galleryForm.captionHindi} onChange={(e) => setGalleryForm((p) => ({ ...p, captionHindi: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Category</label>
                <select value={galleryForm.category} onChange={(e) => setGalleryForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                  {galleryCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Details (English)</label>
                <textarea value={galleryForm.detailsEn} onChange={(e) => setGalleryForm((p) => ({ ...p, detailsEn: e.target.value }))} className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Details (Hindi)</label>
                <textarea value={galleryForm.detailsHi} onChange={(e) => setGalleryForm((p) => ({ ...p, detailsHi: e.target.value }))} className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <button
              type="button"
              onClick={editingGalleryId ? updateGallery : submitGallery}
              disabled={busy}
              className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : editingGalleryId ? "Save Gallery Event" : "Add Gallery Event"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {gallery.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <div className="h-44 bg-zinc-100 sm:h-full">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.caption || "Gallery image"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{item.category}</span>
                      <span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">{item.caption || "Untitled gallery event"}</h3>
                    {item.captionHindi && <p className="mt-1 text-sm text-zinc-500">{item.captionHindi}</p>}
                    {item.detailsEn && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{item.detailsEn}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGalleryId(item.id);
                          setGalleryForm({
                            imageUrl: item.imageUrl,
                            caption: item.caption || "",
                            captionHindi: item.captionHindi || "",
                            detailsEn: item.detailsEn || "",
                            detailsHi: item.detailsHi || "",
                            category: item.category,
                          });
                        }}
                        className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGallery(item.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {gallery.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2">
                No gallery events found. Add the first event image above.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "visitorCertificates" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Issue Non-Member Visitor Certificate</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Choose one of 6 templates, generate a QR-verified certificate, email it automatically, and keep the record here.
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Recipient Name *</label>
                <input value={visitorCertificateForm.recipientName} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, recipientName: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Recipient Email *</label>
                <input type="email" value={visitorCertificateForm.recipientEmail} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, recipientEmail: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Phone</label>
                <input value={visitorCertificateForm.recipientPhone} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, recipientPhone: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Certificate Title *</label>
                <input value={visitorCertificateForm.title} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Event Name</label>
                <input value={visitorCertificateForm.eventName} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, eventName: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Issued By</label>
                <input value={visitorCertificateForm.issuedBy} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, issuedBy: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Certificate Description *</label>
              <textarea value={visitorCertificateForm.description} onChange={(e) => setVisitorCertificateForm((p) => ({ ...p, description: e.target.value }))} className="h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-700">Template</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visitorCertificateTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setVisitorCertificateForm((p) => ({ ...p, templateId: template.id }))}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
                      visitorCertificateForm.templateId === template.id
                        ? `${template.tone} ring-2 ring-rose-700/20`
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={issueVisitorCertificate} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Issuing..." : "Issue & Email Certificate"}
            </button>
          </div>

          <div className="space-y-3">
            {visitorCertificates.map((certificate) => {
              const template = visitorCertificateTemplates.find((item) => item.id === certificate.templateId) ?? visitorCertificateTemplates[0];
              return (
                <div key={certificate.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900">{certificate.recipientName}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(certificate.status)}`}>
                          {certificate.status}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${template.tone}`}>
                          {template.name}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">{certificate.recipientEmail} | {certificate.title}</p>
                      <p className="text-xs text-zinc-500">
                        {certificate.certificateNumber} | Issued {shortDate(certificate.issuedAt)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{certificate.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/visitor-certificates/${certificate.id}/download`}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Download PDF
                      </a>
                      <a
                        href={`${publicSiteUrl}/verify?certificateNumber=${encodeURIComponent(certificate.certificateNumber)}&documentType=visitor-certificate`}
                        target="_blank"
                        className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                      >
                        Verify
                      </a>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateVisitorCertificateStatus(certificate.id, certificate.status === "issued" ? "revoked" : "issued")}
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                      >
                        {certificate.status === "issued" ? "Revoke" : "Restore"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeVisitorCertificate(certificate.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {visitorCertificates.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
                No visitor certificates issued yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
