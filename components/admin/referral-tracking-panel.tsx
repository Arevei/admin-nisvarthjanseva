"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReferralAchievementTier } from "@/lib/types";

type ReferralAchievementItem = {
  tier: ReferralAchievementTier;
  certificateNumber: string;
  donationAmount: number;
  thresholdAmount: number;
  issuedAt: string;
  updatedAt?: string | null;
  source: "automatic" | "admin";
  emailSent?: boolean;
  lastEmailSentAt?: string | null;
};

type ReferralMemberRow = {
  id: number;
  name: string;
  email: string;
  membershipId: string;
  membershipReferrals: number;
  donationReferrals: number;
  donationAmount: number;
  referralAchievement: ReferralAchievementItem | null;
};

const tiers: Array<{ tier: ReferralAchievementTier; label: string; thresholdAmount: number }> = [
  { tier: "silver", label: "Silver", thresholdAmount: 10000 },
  { tier: "gold", label: "Gold", thresholdAmount: 25000 },
  { tier: "platinum", label: "Platinum", thresholdAmount: 50000 },
  { tier: "diamond", label: "Diamond", thresholdAmount: 100000 },
];

function money(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function tierLabel(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function ReferralTrackingPanel({ initialRows }: { initialRows: ReferralMemberRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const totals = useMemo(
    () => ({
      members: rows.length,
      referredMembers: rows.reduce((total, row) => total + row.membershipReferrals, 0),
      referredDonations: rows.reduce((total, row) => total + row.donationReferrals, 0),
      donationAmount: rows.reduce((total, row) => total + row.donationAmount, 0),
      certificates: rows.filter((row) => row.referralAchievement).length,
    }),
    [rows],
  );

  const updateTier = async (memberId: number, tier: ReferralAchievementTier | "") => {
    setBusyMemberId(memberId);
    setError("");

    try {
      const response = await fetch(`/api/referral-achievements/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier: tier || null }),
      });
      const payload = (await response.json()) as {
        error?: string;
        member?: { id: number; referralAchievement: ReferralAchievementItem | null };
        emailSent?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update referral achievement");
      }

      if (payload.member) {
        setRows((current) =>
          current.map((row) =>
            row.id === memberId
              ? { ...row, referralAchievement: payload.member?.referralAchievement ?? null }
              : row,
          ),
        );
      }

      if (tier && payload.emailSent === false) {
        setError("Certificate updated, but email could not be sent. Check SMTP settings.");
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update referral achievement");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-rose-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Referral Achievement Center
            </p>
            <h1 className="mt-3 text-3xl font-bold">Referral Tracking</h1>
            <p className="mt-1 text-sm text-rose-100">
              Track member referral collections and manage Silver, Gold, Platinum, and Diamond certificates.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Members</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.members}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Member Referrals</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.referredMembers}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Donation Referrals</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.referredDonations}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Collection</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totals.donationAmount)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Certificates</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.certificates}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Certificate Thresholds</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {tiers.map((tier) => (
            <div key={tier.tier} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">{tier.label} Badge</p>
              <p className="mt-1 text-xl font-bold text-rose-700">{money(tier.thresholdAmount)}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_1.1fr_1.3fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <span>Member</span>
          <span>Members</span>
          <span>Donations</span>
          <span>Collection</span>
          <span>Current Certificate</span>
          <span>Admin Allotment</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_1.1fr_1.3fr] gap-3 border-t border-zinc-200 px-4 py-4 text-sm"
          >
            <div>
              <p className="font-semibold text-zinc-900">{row.name}</p>
              <p className="text-xs text-zinc-500">{row.membershipId}</p>
              <p className="text-xs text-zinc-500">{row.email}</p>
            </div>
            <p className="text-zinc-800">{row.membershipReferrals}</p>
            <p className="text-zinc-800">{row.donationReferrals}</p>
            <p className="font-semibold text-zinc-900">{money(row.donationAmount)}</p>
            <div>
              {row.referralAchievement ? (
                <>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {tierLabel(row.referralAchievement.tier)}
                  </span>
                  <p className="mt-1 break-all text-xs text-zinc-500">{row.referralAchievement.certificateNumber}</p>
                  <a
                    href={`/api/referral-achievements/${row.id}/download`}
                    className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Download
                  </a>
                </>
              ) : (
                <span className="text-xs text-zinc-500">Not allotted</span>
              )}
            </div>
            <div>
              <select
                value={row.referralAchievement?.tier ?? ""}
                disabled={busyMemberId === row.id}
                onChange={(event) => updateTier(row.id, event.target.value as ReferralAchievementTier | "")}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">No certificate</option>
                {tiers.map((tier) => (
                  <option key={tier.tier} value={tier.tier}>
                    {tier.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                {busyMemberId === row.id ? "Saving..." : "Changing tier emails the member."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
