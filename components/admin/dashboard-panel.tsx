"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { CloudinaryUpload } from "@/components/admin/cloudinary-upload";
import { EnquiryManagementPanel, type EnquiryItem } from "@/components/admin/enquiry-management-panel";
import { ReceiptDashboardPanel, type DonationReceiptItem, type MembershipReceiptItem } from "@/components/admin/receipt-dashboard-panel";
import { ReferralTrackingPanel, type ReferralMemberRow } from "@/components/admin/referral-tracking-panel";

type Tab =
  | "home"
  | "members"
  | "donations"
  | "analytics"
  | "referrals"
  | "receipts"
  | "enquiries"
  | "broadcasts"
  | "news"
  | "campaigns"
  | "gallery"
  | "visitorCertificates"
  | "siteSettings";

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
  donationAmount: number;
  donationCount: number;
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
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

type MemberMessageItem = {
  id: number;
  title: string;
  message: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
};

type DonationItem = {
  id: number;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone: string | null;
  donorPan: string | null;
  donorAddress: string | null;
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
  imageUrls?: string[];
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
  if (status === "approval_pending") return "bg-amber-100 text-amber-800";
  if (status === "payment_pending") return "bg-amber-100 text-amber-800";
  if (status === "pending") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-rose-100 text-rose-800";
  if (status === "suspended") return "bg-zinc-200 text-zinc-700";
  return "bg-zinc-100 text-zinc-700";
}

function money(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function compactMoney(amount: number) {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return money(amount);
}

function percent(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
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

function dateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeGalleryImages(item: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  return Array.from(
    new Set(
      [...(item.imageUrls ?? []), item.imageUrl]
        .map((imageUrl) => imageUrl?.trim())
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
    ),
  ).slice(0, 4);
}

function isVideoUrl(value: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(value) || /\/video\/upload\//i.test(value);
}

function galleryMediaLabel(index: number) {
  return index === 0 ? "Cover Image (required)" : `Media ${index + 1}: image or video`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function nextBirthday(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  const daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return { date: next, daysUntil };
}

export function DashboardPanel({
  email,
  initialNews,
  initialCampaigns,
  initialMembers,
  initialDonations,
  initialGallery,
  initialVisitorCertificates,
  initialReferralRows,
  initialMembershipReceipts,
  initialDonationReceipts,
  initialEnquiries,
}: {
  email: string;
  initialNews: NewsItem[];
  initialCampaigns: CampaignItem[];
  initialMembers: MemberItem[];
  initialDonations: DonationItem[];
  initialGallery: GalleryItem[];
  initialVisitorCertificates: VisitorCertificateItem[];
  initialReferralRows: ReferralMemberRow[];
  initialMembershipReceipts: MembershipReceiptItem[];
  initialDonationReceipts: DonationReceiptItem[];
  initialEnquiries: EnquiryItem[];
}) {
  const router = useRouter();
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const newsFormRef = useRef<HTMLDivElement | null>(null);
  const newsTitleInputRef = useRef<HTMLInputElement | null>(null);
  const campaignFormRef = useRef<HTMLDivElement | null>(null);
  const campaignTitleInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [donations, setDonations] = useState<DonationItem[]>(initialDonations);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [visitorCertificates, setVisitorCertificates] = useState<VisitorCertificateItem[]>(initialVisitorCertificates);
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
  const [expandedDonationId, setExpandedDonationId] = useState<number | null>(null);
  const [donationTrendMode, setDonationTrendMode] = useState<"daily" | "monthly">("daily");
  const [useExistingDonationMember, setUseExistingDonationMember] = useState(false);
  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [latestMemberMessage, setLatestMemberMessage] = useState<MemberMessageItem | null>(null);
  const [memberMessageForm, setMemberMessageForm] = useState({
    title: "Foundation Update",
    message: "",
    isActive: true,
  });
  const [memberMessageStatus, setMemberMessageStatus] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "hi">("hi");
  const [siteSettingsStatus, setSiteSettingsStatus] = useState("");

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
    startDate: "",
    endDate: "",
  });

  const [galleryForm, setGalleryForm] = useState({
    imageUrls: [""],
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
    donorPan: "",
    donorAddress: "",
    campaignId: "",
    purpose: "General Donation",
    paymentMode: "cash" as (typeof donationPaymentModes)[number],
    paymentReference: "",
    referralCode: "",
    memberId: "",
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

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedMemberSearch(memberSearchInput.trim().toLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [memberSearchInput]);

  const loadLatestMemberMessage = async () => {
    try {
      const response = await fetch("/api/member-messages", { credentials: "include" });
      if (!response.ok) return;
      const payload = (await response.json()) as { message: MemberMessageItem | null };
      setLatestMemberMessage(payload.message);
    } catch {
      setLatestMemberMessage(null);
    }
  };

  useEffect(() => {
    window.setTimeout(() => {
      void loadLatestMemberMessage();
    }, 0);
  }, []);

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
  const memberSearchResults = useMemo(() => {
    if (!useExistingDonationMember || !debouncedMemberSearch || donationForm.memberId) return [];

    return members
      .filter((member) => {
        const searchable = `${member.name} ${member.email} ${member.phone} ${member.membershipId} ${member.id}`.toLowerCase();
        return searchable.includes(debouncedMemberSearch);
      })
      .slice(0, 8);
  }, [debouncedMemberSearch, donationForm.memberId, members, useExistingDonationMember]);
  const totalDonationAmount = useMemo(
    () => paidDonations.reduce((total, donation) => total + donation.amount, 0),
    [paidDonations],
  );
  const donationAnalytics = useMemo(() => {
    const campaignTotals = campaigns.map((campaign) => {
      const campaignDonations = paidDonations.filter((donation) => donation.campaignId === campaign.id);
      const collected = campaignDonations.reduce((total, donation) => total + donation.amount, 0);
      return {
        ...campaign,
        collected,
        donationCount: campaignDonations.length,
        progress: percent(campaign.raisedAmount || collected, campaign.goalAmount),
      };
    });
    const generalDonations = paidDonations.filter((donation) => !donation.campaignId);
    const pendingAmount = donations
      .filter((donation) => donation.paymentStatus !== "paid")
      .reduce((total, donation) => total + donation.amount, 0);

    return {
      activeCampaigns: campaigns.filter((campaign) => campaign.isActive).length,
      totalGoalAmount: campaigns.reduce((total, campaign) => total + campaign.goalAmount, 0),
      totalRaisedAmount: campaigns.reduce((total, campaign) => total + campaign.raisedAmount, 0),
      generalDonationAmount: generalDonations.reduce((total, donation) => total + donation.amount, 0),
      generalDonationCount: generalDonations.length,
      pendingAmount,
      campaignTotals: campaignTotals.sort((a, b) => b.raisedAmount - a.raisedAmount),
    };
  }, [campaigns, donations, paidDonations]);
  const upcomingBirthdays = useMemo(
    () =>
      members
        .map((member) => {
          const birthday = nextBirthday(member.dateOfBirth);
          return birthday ? { ...member, birthdayDate: birthday.date, daysUntilBirthday: birthday.daysUntil } : null;
        })
        .filter((member): member is MemberItem & { birthdayDate: Date; daysUntilBirthday: number } => Boolean(member))
        .filter((member) => member.daysUntilBirthday <= 3)
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)
        .slice(0, 8),
    [members],
  );
  const donationTrendBars = useMemo(() => {
    const now = new Date();
    const buckets =
      donationTrendMode === "daily"
        ? Array.from({ length: 14 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - index));
            return {
              key: localDateKey(date),
              label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
              total: 0,
            };
          })
        : Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            return {
              key: `${date.getFullYear()}-${date.getMonth()}`,
              label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
              total: 0,
            };
          });

    paidDonations.forEach((donation) => {
      const date = new Date(donation.paidAt || donation.createdAt);
      const key = donationTrendMode === "daily" ? localDateKey(date) : `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.total += donation.amount;
    });

    const max = Math.max(...buckets.map((bucket) => bucket.total), 1);
    return buckets.map((bucket) => ({ ...bucket, height: bucket.total > 0 ? Math.max(8, Math.round((bucket.total / max) * 100)) : 0 }));
  }, [donationTrendMode, paidDonations]);
  const tabTitle = {
    home: "Home Dashboard",
    members: "Membership Management",
    donations: "Donation Management",
    analytics: "Analytics",
    referrals: "Referral Tracking",
    receipts: "Receipt Dashboard",
    enquiries: "Enquiry Management",
    broadcasts: "Member Messages",
    news: "News Management",
    campaigns: "Campaign Management",
    gallery: "Activity Posts",
    visitorCertificates: "Visitor Certificates",
    siteSettings: "Site Settings",
  }[tab];

  const scrollToEditorForm = (formRef: RefObject<HTMLDivElement | null>, focusRef: RefObject<HTMLInputElement | null>) => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      focusRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  useEffect(() => {
    if (tab !== "siteSettings") return;

    fetch("/api/site-settings", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load site settings");
        const data = (await response.json()) as { defaultLanguage?: "en" | "hi" };
        if (data.defaultLanguage === "en" || data.defaultLanguage === "hi") {
          setDefaultLanguage(data.defaultLanguage);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load site settings");
      });
  }, [tab]);

  const saveSiteSettings = async () => {
    setBusy(true);
    setError("");
    setSiteSettingsStatus("");
    try {
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save site settings");
      }
      setSiteSettingsStatus("Site settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save site settings");
    } finally {
      setBusy(false);
    }
  };

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
    action: "approve" | "activate" | "reject" | "suspend" | "send_documents",
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as {
        error?: string;
        emailSent?: boolean;
        messageId?: string | null;
        member?: MemberItem;
      };

      if (!response.ok && response.status !== 207) {
        throw new Error(payload.error || "Failed to update member");
      }

      if (response.status === 207 && payload.error) {
        setError(payload.error);
      } else if ((action === "activate" || action === "send_documents") && payload.emailSent) {
        setSuccess("Membership ID card and certificate email sent successfully.");
      }

      await refreshAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update member");
    } finally {
      setBusy(false);
    }
  };

  const resetNewsForm = () => {
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
    setEditingNewsId(null);
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

      resetNewsForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create news");
    } finally {
      setBusy(false);
    }
  };

  const updateNews = async () => {
    if (!editingNewsId) return;
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      setError("News title and content are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/news/${editingNewsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newsForm,
          excerpt: newsForm.excerpt || stripHtml(newsForm.content).slice(0, 160),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update news");
      }

      resetNewsForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update news");
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
      if (editingNewsId === id) resetNewsForm();
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
        startDate: "",
        endDate: "",
      });
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      title: "",
      titleHindi: "",
      description: "",
      descriptionHindi: "",
      goalAmount: "",
      category: "general",
      imageUrl: "",
      isActive: true,
      startDate: "",
      endDate: "",
    });
    setEditingCampaignId(null);
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
      resetCampaignForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update campaign");
    } finally {
      setBusy(false);
    }
  };

  const saveEditingCampaign = async () => {
    if (!editingCampaignId) return;
    const existing = campaigns.find((campaign) => campaign.id === editingCampaignId);
    if (!existing) {
      setError("Campaign not found for editing.");
      return;
    }

    await updateCampaign({
      ...existing,
      ...campaignForm,
      titleHindi: campaignForm.titleHindi || null,
      descriptionHindi: campaignForm.descriptionHindi || null,
      imageUrl: campaignForm.imageUrl || null,
      goalAmount: Number(campaignForm.goalAmount),
      startDate: campaignForm.startDate || null,
      endDate: campaignForm.endDate || null,
    });
  };

  const removeCampaign = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete campaign");
      }

      if (editingCampaignId === id) resetCampaignForm();
      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete campaign");
    } finally {
      setBusy(false);
    }
  };

  const publishMemberMessage = async () => {
    if (!memberMessageForm.message.trim()) {
      setError("Broadcast message is required.");
      return;
    }

    setBusy(true);
    setError("");
    setMemberMessageStatus("");
    try {
      const response = await fetch("/api/member-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(memberMessageForm),
      });
      const payload = (await response.json()) as { error?: string; message?: MemberMessageItem };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to publish member message");
      }

      setLatestMemberMessage(payload.message);
      setMemberMessageForm((current) => ({ ...current, message: "" }));
      setMemberMessageStatus("Message published. Members will see it the next time the website loads.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish member message");
    } finally {
      setBusy(false);
    }
  };

  const deleteMemberMessage = async (id: number) => {
    setBusy(true);
    setError("");
    setMemberMessageStatus("");
    try {
      const response = await fetch(`/api/member-messages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete member message");
      }

      setLatestMemberMessage(null);
      setMemberMessageStatus("Message deleted. The public notification icon will not appear until a new message is published.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete member message");
    } finally {
      setBusy(false);
    }
  };

  const resetGalleryForm = () => {
    setGalleryForm({
      imageUrls: [""],
      caption: "",
      captionHindi: "",
      detailsEn: "",
      detailsHi: "",
      category: "events",
    });
    setEditingGalleryId(null);
  };

  const submitGallery = async () => {
    const imageUrls = galleryForm.imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean).slice(0, 4);
    if (imageUrls.length === 0) {
      setError("At least one activity post image is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...galleryForm, imageUrl: imageUrls[0], imageUrls }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to add activity post");
      }

      resetGalleryForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to add activity post");
    } finally {
      setBusy(false);
    }
  };

  const updateGallery = async () => {
    if (!editingGalleryId) return;
    const imageUrls = galleryForm.imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean).slice(0, 4);
    if (imageUrls.length === 0) {
      setError("At least one activity post image is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/gallery/${editingGalleryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...galleryForm, imageUrl: imageUrls[0], imageUrls }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to update activity post");
      }

      resetGalleryForm();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update activity post");
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
        throw new Error(payload.error || "Failed to delete activity post");
      }

      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete activity post");
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
      donorPan: "",
      donorAddress: "",
      campaignId: "",
      purpose: "General Donation",
      paymentMode: "cash",
      paymentReference: "",
      referralCode: "",
      memberId: "",
    });
    setUseExistingDonationMember(false);
    setMemberSearchInput("");
    setDebouncedMemberSearch("");
  };

  const applyDonationMember = (memberId: string) => {
    const member = members.find((item) => String(item.id) === memberId);
    setDonationForm((previous) => ({
      ...previous,
      memberId,
      donorName: member?.name ?? "",
      donorEmail: member?.email ?? "",
      donorPhone: member?.phone ?? "",
      donorAddress: [member?.address, member?.city, member?.state].filter(Boolean).join(", "),
    }));
    if (member) {
      setMemberSearchInput(`${member.name} (${member.membershipId})`);
      setDebouncedMemberSearch("");
    }
  };

  const clearDonationMember = () => {
    setDonationForm((previous) => ({
      ...previous,
      memberId: "",
      donorName: "",
      donorEmail: "",
      donorPhone: "",
      donorPan: "",
      donorAddress: "",
    }));
    setMemberSearchInput("");
    setDebouncedMemberSearch("");
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
          donorPan: donationForm.donorPan,
          donorAddress: donationForm.donorAddress,
          campaignId: donationForm.campaignId ? Number(donationForm.campaignId) : null,
          purpose: donationForm.purpose,
          paymentMode: donationForm.paymentMode,
          paymentReference: donationForm.paymentReference,
          referralCode: donationForm.referralCode || undefined,
          memberId: donationForm.memberId || undefined,
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

  const removeDonation = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/donations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to delete donation");
      }

      if (expandedDonationId === id) setExpandedDonationId(null);
      await refreshAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to delete donation");
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
    <div className="grid min-h-screen gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="rounded-2xl bg-rose-700 p-4 text-white">
          <div className="mb-3 flex justify-center rounded-xl bg-white px-3 py-2.5">
            <Image
              src="/brand/logo-navbar.png"
              alt="Nisvarthjan Seva Foundation"
              width={220}
              height={56}
              className=""
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-100">Admin Panel</p>
          <h1 className="mt-2 text-xl font-bold">Nisvarthjan</h1>
          <p className="mt-1 truncate text-xs text-rose-100">{email}</p>
        </div>

        <nav className="mt-4 space-y-2">
          <details open className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <summary className="cursor-pointer px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">Overview</summary>
            <div className="mt-2 grid gap-1">
              {(["home", "analytics"] as Tab[]).map((item) => (
                <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${tab === item ? "bg-rose-700 text-white" : "text-zinc-700 hover:bg-white"}`}>
                  {item === "home" ? "Dashboard Home" : "Analytics"}
                </button>
              ))}
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <summary className="cursor-pointer px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">People & Money</summary>
            <div className="mt-2 grid gap-1">
              {(["members", "donations", "referrals", "receipts", "visitorCertificates"] as Tab[]).map((item) => (
                <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${tab === item ? "bg-rose-700 text-white" : "text-zinc-700 hover:bg-white"}`}>
                  {item === "visitorCertificates"
                    ? "Visitor Certificates"
                    : item === "referrals"
                      ? "Referral Tracking"
                      : item === "receipts"
                        ? "Receipt Dashboard"
                        : item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <summary className="cursor-pointer px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">Content</summary>
            <div className="mt-2 grid gap-1">
              {(["campaigns", "news", "gallery", "enquiries", "broadcasts", "siteSettings"] as Tab[]).map((item) => (
                <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${tab === item ? "bg-rose-700 text-white" : "text-zinc-700 hover:bg-white"}`}>
                  {item === "gallery"
                    ? "Activity Posts"
                    : item === "enquiries"
                      ? "Enquiries"
                      : item === "broadcasts"
                        ? "Member Messages"
                        : item === "siteSettings"
                          ? "Site Settings"
                          : item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </details>
        </nav>

        <button type="button" onClick={logout} className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          Logout
        </button>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">Command Center</p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-950">{tabTitle}</h2>
            </div>
            <button type="button" onClick={refreshQueue} className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">
              Refresh
            </button>
          </div>
        </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      {tab === "home" && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Reviews</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{pendingMembers.length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Awaiting Payment</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{paymentPendingMembers.length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Active Members</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{activeMembers.length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Live Campaigns</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{campaigns.filter((c) => c.isActive).length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Donation Amount</p>
              <p className="mt-1 break-words text-2xl font-bold text-zinc-900">{money(totalDonationAmount)}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Donation Trend</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {donationTrendMode === "daily" ? "Last 14 days paid donation volume" : "Last 6 months paid donation volume"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                    {(["daily", "monthly"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDonationTrendMode(mode)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold ${
                          donationTrendMode === mode ? "bg-rose-700 text-white" : "text-zinc-600 hover:bg-white"
                        }`}
                      >
                        {mode === "daily" ? "Day" : "Month"}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-rose-700">{money(totalDonationAmount)}</p>
                </div>
              </div>
              <div className="mt-6 grid h-56 grid-cols-7 items-end gap-2 overflow-hidden rounded-xl bg-zinc-50 p-4 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
                {donationTrendBars.map((bucket) => (
                  <div key={bucket.key} className="flex min-w-0 flex-col items-center justify-end gap-2">
                    <div className="flex h-28 w-full max-w-12 items-end rounded-t-lg bg-rose-100">
                      <div className="w-full rounded-t-lg bg-rose-700" style={{ height: `${bucket.height}%` }} />
                    </div>
                    <p className="whitespace-nowrap text-[11px] font-semibold text-zinc-600">{bucket.label}</p>
                    <p className="whitespace-nowrap text-[10px] text-zinc-500">{compactMoney(bucket.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900">Upcoming Birthdays</h3>
              <p className="mt-1 text-sm text-zinc-500">Member birthdays due in the next 3 days</p>
              <div className="mt-4 space-y-3">
                {upcomingBirthdays.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{member.name}</p>
                      <p className="text-xs text-zinc-500">{member.membershipId} | {member.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-700">
                        {member.daysUntilBirthday === 0 ? "Today" : `${member.daysUntilBirthday} days`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {member.birthdayDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingBirthdays.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                    No member birthdays in the next 3 days.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {donationAnalytics.campaignTotals.slice(0, 3).map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{campaign.category}</p>
                <h3 className="mt-1 truncate font-bold text-zinc-900">{campaign.title}</h3>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full rounded-full bg-rose-700" style={{ width: `${campaign.progress}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-700">{campaign.progress}% funded</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
              Approve manual registrations, activate paid Razorpay memberships, and send certificates after final admin approval.
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
                    <p className="mt-1 text-xs font-semibold text-zinc-700">
                      Donations by member: {member.donationCount} | {money(member.donationAmount)}
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
                    {(member.status === "payment_pending" || member.status === "approval_pending") && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => memberAction(member.id, "activate")}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Activate & Send Documents
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
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => memberAction(member.id, "send_documents")}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Send Documents
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => memberAction(member.id, "suspend")}
                          className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                        >
                          Suspend
                        </button>
                      </>
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
                <label className="mb-1 block text-sm font-medium text-zinc-700">Donor PAN for 80G</label>
                <input value={donationForm.donorPan} onChange={(e) => setDonationForm((p) => ({ ...p, donorPan: e.target.value.toUpperCase() }))} maxLength={10} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="ABCDE1234F" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700">Donor Address for 80G</label>
                <input value={donationForm.donorAddress} onChange={(e) => setDonationForm((p) => ({ ...p, donorAddress: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
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

            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={useExistingDonationMember}
                  onChange={(event) => {
                    setUseExistingDonationMember(event.target.checked);
                    if (!event.target.checked) clearDonationMember();
                  }}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Use existing member details
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Keep unchecked for non-member/manual entry. Check it to search by member ID, name, email, or phone.
              </p>

              {useExistingDonationMember && (
                <div className="mt-3 max-w-xl">
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Search Member</label>
                  <input
                    value={memberSearchInput}
                    onChange={(event) => {
                      setMemberSearchInput(event.target.value);
                      setDonationForm((previous) => ({ ...previous, memberId: "" }));
                    }}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Search NSF ID, name, email, or phone"
                  />
                  {memberSearchResults.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                      {memberSearchResults.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => applyDonationMember(String(member.id))}
                          className="block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-rose-50"
                        >
                          <span className="font-semibold text-zinc-900">{member.name}</span>
                          <span className="ml-2 font-mono text-xs text-rose-700">{member.membershipId}</span>
                          <span className="block text-xs text-zinc-500">{member.email} | {member.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {debouncedMemberSearch && memberSearchResults.length === 0 && !donationForm.memberId && (
                    <p className="mt-2 rounded-md border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-500">
                      No matching member found.
                    </p>
                  )}
                  {donationForm.memberId && (
                    <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Selected member details will be used for donor name, email, and phone.
                    </p>
                  )}
                </div>
              )}
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

          <div className="space-y-3">
            {donations.map((donation) => {
              const expanded = expandedDonationId === donation.id;
              const isPaid = donation.paymentStatus === "paid";
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
                      {isPaid ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeDonation(donation.id)}
                          disabled={busy}
                          className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          Delete Unpaid
                        </button>
                      )}
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
                            <dt className="text-zinc-500">Donor PAN</dt>
                            <dd className="text-right text-zinc-800">{donation.donorPan || "Not provided"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500">Donor address</dt>
                            <dd className="text-right text-zinc-800">{donation.donorAddress || "Not provided"}</dd>
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

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Crowd Funding Analytics</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Monitor donation collections, campaign goals, and simultaneous active fundraising campaigns.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshQueue}
                className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
              >
                Refresh Analytics
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total Received</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totalDonationAmount)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Campaign Goals</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{money(donationAnalytics.totalGoalAmount)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Active Campaigns</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{donationAnalytics.activeCampaigns}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Orders</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{money(donationAnalytics.pendingAmount)}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900">Campaign Goal Progress</h3>
              <div className="mt-4 space-y-4">
                {donationAnalytics.campaignTotals.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-zinc-900">{campaign.title}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${campaign.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                            {campaign.isActive ? "active" : "inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {campaign.donationCount} paid donations | {campaign.category}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {money(campaign.raisedAmount)} / {money(campaign.goalAmount)}
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full rounded-full bg-rose-700" style={{ width: `${campaign.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-600">{campaign.progress}% of goal reached</p>
                  </div>
                ))}
                {donationAnalytics.campaignTotals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                    No campaigns found. Create multiple campaigns from the Campaigns tab.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-zinc-900">Donation Mix</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Campaign donations</dt>
                    <dd className="font-semibold text-zinc-900">{paidDonations.length - donationAnalytics.generalDonationCount}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">General donations</dt>
                    <dd className="font-semibold text-zinc-900">{donationAnalytics.generalDonationCount}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">General amount</dt>
                    <dd className="font-semibold text-zinc-900">{money(donationAnalytics.generalDonationAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Overall goal progress</dt>
                    <dd className="font-semibold text-zinc-900">
                      {percent(donationAnalytics.totalRaisedAmount, donationAnalytics.totalGoalAmount)}%
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-zinc-900">Multiple Campaign Management</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  The Campaigns tab can run any number of fundraising campaigns at the same time. Keep several campaigns active, pause inactive campaigns, and track each goal independently here.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("campaigns")}
                  className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                >
                  Manage Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "referrals" && (
        <ReferralTrackingPanel initialRows={initialReferralRows} embedded />
      )}

      {tab === "receipts" && (
        <ReceiptDashboardPanel
          initialMembershipReceipts={initialMembershipReceipts}
          initialDonationReceipts={initialDonationReceipts}
          embedded
        />
      )}

      {tab === "enquiries" && (
        <EnquiryManagementPanel initialEnquiries={initialEnquiries} embedded />
      )}

      {tab === "news" && (
        <div className="space-y-4">
          <div ref={newsFormRef} className="scroll-mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900">{editingNewsId ? "Edit News" : "Create News"}</h2>
              {editingNewsId && (
                <button
                  type="button"
                  onClick={resetNewsForm}
                  className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (English)</label>
                <input ref={newsTitleInputRef} value={newsForm.title} onChange={(e) => setNewsForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
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

            <button type="button" onClick={editingNewsId ? updateNews : submitNews} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Saving..." : editingNewsId ? "Update News" : "Publish News"}
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNewsId(item.id);
                        setNewsForm({
                          title: item.title,
                          titleHindi: item.titleHindi || "",
                          content: item.content,
                          contentHindi: item.contentHindi || "",
                          excerpt: item.excerpt || "",
                          imageUrl: item.imageUrl || "",
                          category: item.category,
                          author: item.author || "",
                        });
                        scrollToEditorForm(newsFormRef, newsTitleInputRef);
                      }}
                      className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                    >
                      Edit News
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNews(item.id)}
                      className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete News
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-4">
          <div ref={campaignFormRef} className="scroll-mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{editingCampaignId ? "Edit Campaign" : "Create Campaign"}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Run multiple fundraising campaigns simultaneously and manage each campaign goal independently.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {editingCampaignId && (
                  <button
                    type="button"
                    onClick={resetCampaignForm}
                    className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                  >
                    Cancel Edit
                  </button>
                )}
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {campaigns.filter((campaign) => campaign.isActive).length} active campaigns
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Title (English)</label>
                <input ref={campaignTitleInputRef} value={campaignForm.title} onChange={(e) => setCampaignForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
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
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Start Date</label>
                <input type="date" value={campaignForm.startDate} onChange={(e) => setCampaignForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">End Date</label>
                <input type="date" value={campaignForm.endDate} onChange={(e) => setCampaignForm((p) => ({ ...p, endDate: e.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
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

            <button type="button" onClick={editingCampaignId ? saveEditingCampaign : submitCampaign} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Saving..." : editingCampaignId ? "Update Campaign" : "Create Campaign"}
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500">{item.category} | Goal Rs {item.goalAmount.toLocaleString("en-IN")}</p>
                    {(item.startDate || item.endDate) && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Duration: {item.startDate ? shortDate(item.startDate).split(",")[0] : "Anytime"} - {item.endDate ? shortDate(item.endDate).split(",")[0] : "Open ended"}
                      </p>
                    )}
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
                          startDate: dateInputValue(item.startDate),
                          endDate: dateInputValue(item.endDate),
                        });
                        scrollToEditorForm(campaignFormRef, campaignTitleInputRef);
                      }}
                      className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCampaign(item.id)}
                      className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "broadcasts" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Send Message to Members</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Publish one notification message for all website visitors and members. The newest active message appears once per browser.
                </p>
              </div>
              {latestMemberMessage && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latestMemberMessage.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                  Latest #{latestMemberMessage.id}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Message Title</label>
                <input
                  value={memberMessageForm.title}
                  onChange={(event) => setMemberMessageForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 self-end">
                <input
                  type="checkbox"
                  checked={memberMessageForm.isActive}
                  onChange={(event) => setMemberMessageForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span className="text-sm text-zinc-700">Show this message on the public website</span>
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Message</label>
              <textarea
                value={memberMessageForm.message}
                onChange={(event) => setMemberMessageForm((current) => ({ ...current, message: event.target.value }))}
                className="h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Write the update members should see..."
              />
            </div>

            {memberMessageStatus && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{memberMessageStatus}</p>}

            <button type="button" onClick={publishMemberMessage} disabled={busy} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
              {busy ? "Publishing..." : "Publish Message"}
            </button>
          </div>

          {latestMemberMessage && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Latest Published Message</p>
                  <h3 className="mt-2 text-lg font-bold text-zinc-900">{latestMemberMessage.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{latestMemberMessage.message}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    Published by {latestMemberMessage.createdBy} on {shortDate(latestMemberMessage.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMemberMessage(latestMemberMessage.id)}
                  disabled={busy}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "gallery" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {editingGalleryId ? "Edit Activity Post" : "Add Activity Post"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  These activity posts appear on the public gallery page and the home page activity highlights.
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

            <div className="mt-4 space-y-3">
              {galleryForm.imageUrls.map((imageUrl, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {galleryMediaLabel(index)}
                    </span>
                    {galleryForm.imageUrls.length > 1 && (
                      <button
                        type="button"
                        title={`Remove ${galleryMediaLabel(index)}`}
                        aria-label={`Remove ${galleryMediaLabel(index)}`}
                        onClick={() =>
                          setGalleryForm((previous) => ({
                            ...previous,
                            imageUrls: previous.imageUrls.filter((_, mediaIndex) => mediaIndex !== index),
                          }))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      >
                        <span className="text-base leading-none">x</span>
                      </button>
                    )}
                  </div>
                  <CloudinaryUpload
                    value={imageUrl}
                    onChange={(nextImageUrl) =>
                      setGalleryForm((previous) => {
                        const imageUrls = [...previous.imageUrls];
                        imageUrls[index] = nextImageUrl;
                        return { ...previous, imageUrls };
                      })
                    }
                    label={galleryMediaLabel(index)}
                    accept={index === 0 ? "image/*" : "image/*,video/*"}
                    uploadText={index === 0 ? "Upload cover image to Cloudinary" : "Upload image or video to Cloudinary"}
                    chooseText={index === 0 ? "Choose Image" : "Choose Media"}
                  />
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                {galleryForm.imageUrls.length < 4 && (
                  <button
                    type="button"
                    title="Add media"
                    aria-label="Add media"
                    onClick={() => setGalleryForm((previous) => ({ ...previous, imageUrls: [...previous.imageUrls, ""] }))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    <span className="text-xl leading-none">+</span>
                  </button>
                )}
                <p className="text-xs text-zinc-500">
                  Add up to 4 media items. The first image is the cover; media 2, 3 and 4 can be images or videos.
                </p>
              </div>
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
                <RichTextEditor value={galleryForm.detailsEn} onChange={(detailsEn) => setGalleryForm((p) => ({ ...p, detailsEn }))} placeholder="Write activity details..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Details (Hindi)</label>
                <RichTextEditor value={galleryForm.detailsHi} onChange={(detailsHi) => setGalleryForm((p) => ({ ...p, detailsHi }))} placeholder="Write activity details in Hindi..." />
              </div>
            </div>

            <button
              type="button"
              onClick={editingGalleryId ? updateGallery : submitGallery}
              disabled={busy}
              className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : editingGalleryId ? "Save Activity Post" : "Add Activity Post"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {gallery.map((item) => {
              const itemImages = normalizeGalleryImages(item);

              return (
                <div key={item.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                    <div className="relative h-44 bg-zinc-100 sm:h-full">
                      {itemImages[0] ? (
                        <>
                          {isVideoUrl(itemImages[0]) ? (
                            <video src={itemImages[0]} className="absolute inset-0 h-full w-full bg-black object-contain p-2" muted />
                          ) : (
                            <>
                              <img src={itemImages[0]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg" />
                              <div className="absolute inset-0 bg-black/20" />
                              <img src={itemImages[0]} alt={item.caption || "Activity post image"} className="absolute inset-0 h-full w-full object-contain p-2" />
                            </>
                          )}
                          {itemImages.length > 1 && (
                            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                              1/{itemImages.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{item.category}</span>
                        <span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString("en-IN")}</span>
                        {itemImages.length > 1 && <span className="text-xs text-zinc-500">{itemImages.length} media</span>}
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900">{item.caption || "Untitled activity post"}</h3>
                      {item.captionHindi && <p className="mt-1 text-sm text-zinc-500">{item.captionHindi}</p>}
                      {item.detailsEn && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{stripHtml(item.detailsEn)}</p>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const imageUrls = itemImages.length > 0 ? itemImages : [""];
                            setEditingGalleryId(item.id);
                            setGalleryForm({
                              imageUrls,
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
              );
            })}
            {gallery.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2">
                No activity posts found. Add the first activity image above.
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

      {tab === "siteSettings" && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-950">Website Default Language</h3>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Choose the default language for new visitors. Returning visitors who already picked a language in the navbar keep their saved choice.
          </p>

          <div className="mt-6 max-w-md space-y-4">
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="default-language">
              Default language
            </label>
            <select
              id="default-language"
              value={defaultLanguage}
              onChange={(event) => setDefaultLanguage(event.target.value as "en" | "hi")}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900"
            >
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>

            <button
              type="button"
              disabled={busy}
              onClick={saveSiteSettings}
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              Save Settings
            </button>

            {siteSettingsStatus && <p className="text-sm font-medium text-emerald-700">{siteSettingsStatus}</p>}
          </div>
        </div>
      )}
      </section>
    </div>
  );
}
