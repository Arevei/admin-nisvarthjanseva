"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { CloudinaryUpload } from "@/components/admin/cloudinary-upload";

type Tab = "members" | "donations" | "news" | "campaigns";

type MemberItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  membershipType: "general" | "active" | "lifetime";
  membershipId: string;
  status: string;
  certificateNumber: string | null;
  joinedAt: string;
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
  paymentMode: string;
  paymentStatus: string;
  orderId: string | null;
  paymentId: string | null;
  razorpayReceipt: string | null;
  paidAt: string | null;
  createdAt: string;
};

const campaignCategories = ["education", "health", "environment", "women", "rural", "disaster", "general"];
const newsCategories = ["general", "health", "education", "environment", "women", "rural"];

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
}: {
  email: string;
  initialNews: NewsItem[];
  initialCampaigns: CampaignItem[];
  initialMembers: MemberItem[];
  initialDonations: DonationItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("members");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [donations, setDonations] = useState<DonationItem[]>(initialDonations);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
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

  const refreshAll = async () => {
    setError("");
    const [membersRes, newsRes, campaignsRes, donationsRes] = await Promise.all([
      fetch("/api/members", { credentials: "include" }),
      fetch("/api/news", { credentials: "include" }),
      fetch("/api/campaigns", { credentials: "include" }),
      fetch("/api/donations", { credentials: "include" }),
    ]);
    if (!membersRes.ok || !newsRes.ok || !campaignsRes.ok || !donationsRes.ok) {
      throw new Error("Failed to refresh dashboard data");
    }
    const membersData = (await membersRes.json()) as MemberItem[];
    const newsData = (await newsRes.json()) as NewsItem[];
    const campaignsData = (await campaignsRes.json()) as CampaignItem[];
    const donationsData = (await donationsRes.json()) as DonationItem[];
    setMembers(membersData);
    setNews(newsData);
    setCampaigns(campaignsData);
    setDonations(donationsData);
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
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedDonationId(expanded ? null : donation.id)}
                      className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                    >
                      {expanded ? "Hide Details" : "View Details"}
                    </button>
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
    </div>
  );
}
