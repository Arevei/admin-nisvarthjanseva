"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

type MembershipReceiptItem = {
  id: number;
  memberName: string;
  memberEmail: string;
  membershipId: string;
  receiptNumber: string;
  amount: number;
  status: string;
  paymentMode: string;
  paidAt: string;
};

type DonationReceiptItem = {
  id: number;
  donorName: string;
  donorEmail: string;
  receiptNumber: string;
  amount: number;
  status: string;
  paymentMode: string;
  purpose: string;
  paidAt: string;
};

type EventReceiptItem = {
  id: number;
  receiptNumber: string;
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  amount: number;
  status: "paid" | "cancelled" | "refunded";
  paymentMode: string;
  paymentReference: string | null;
  paidAt: string;
  notes: string | null;
  createdAt: string;
};

type ReceiptTab = "all" | "membership" | "donation" | "event" | "cash";

const receiptTabs: Array<{ id: ReceiptTab; label: string }> = [
  { id: "all", label: "All Receipts" },
  { id: "membership", label: "Membership" },
  { id: "donation", label: "Donation" },
  { id: "event", label: "Event Registration" },
  { id: "cash", label: "Cash Donation" },
];

const paymentModes = ["cash", "upi", "bank_transfer", "other", "manual"] as const;

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

export function ReceiptDashboardPanel({
  initialMembershipReceipts,
  initialDonationReceipts,
  initialEventReceipts,
}: {
  initialMembershipReceipts: MembershipReceiptItem[];
  initialDonationReceipts: DonationReceiptItem[];
  initialEventReceipts: EventReceiptItem[];
}) {
  const [tab, setTab] = useState<ReceiptTab>("all");
  const [eventReceipts, setEventReceipts] = useState<EventReceiptItem[]>(initialEventReceipts);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventName: "",
    attendeeName: "",
    attendeeEmail: "",
    attendeePhone: "",
    amount: "",
    paymentMode: "cash" as (typeof paymentModes)[number],
    paymentReference: "",
    notes: "",
  });

  const cashDonationReceipts = useMemo(
    () => initialDonationReceipts.filter((receipt) => receipt.paymentMode === "cash"),
    [initialDonationReceipts],
  );

  const totals = useMemo(() => {
    const membershipTotal = initialMembershipReceipts.reduce((total, receipt) => total + receipt.amount, 0);
    const donationTotal = initialDonationReceipts.reduce((total, receipt) => total + receipt.amount, 0);
    const eventTotal = eventReceipts.reduce((total, receipt) => total + receipt.amount, 0);
    const cashTotal = cashDonationReceipts.reduce((total, receipt) => total + receipt.amount, 0);

    return {
      count: initialMembershipReceipts.length + initialDonationReceipts.length + eventReceipts.length,
      membershipTotal,
      donationTotal,
      eventTotal,
      cashTotal,
      grandTotal: membershipTotal + donationTotal + eventTotal,
    };
  }, [cashDonationReceipts, eventReceipts, initialDonationReceipts, initialMembershipReceipts]);

  const resetEventForm = () => {
    setEventForm({
      eventName: "",
      attendeeName: "",
      attendeeEmail: "",
      attendeePhone: "",
      amount: "",
      paymentMode: "cash",
      paymentReference: "",
      notes: "",
    });
  };

  const createEventReceipt = async () => {
    if (!eventForm.eventName.trim() || !eventForm.attendeeName.trim() || !eventForm.attendeeEmail.trim() || !eventForm.amount.trim()) {
      setError("Event name, attendee name, attendee email and amount are required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/event-registration-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...eventForm,
          amount: Number(eventForm.amount),
        }),
      });
      const payload = (await response.json()) as EventReceiptItem & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create event receipt");
      }
      setEventReceipts((current) => [payload, ...current]);
      resetEventForm();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create event receipt");
    } finally {
      setBusy(false);
    }
  };

  const showMembership = tab === "all" || tab === "membership";
  const showDonation = tab === "all" || tab === "donation";
  const showEvent = tab === "all" || tab === "event";
  const showCash = tab === "all" || tab === "cash";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-rose-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Receipt Management
            </p>
            <h1 className="mt-3 text-3xl font-bold">Receipt Dashboard</h1>
            <p className="mt-1 text-sm text-rose-100">
              View and manage membership, donation, event registration, and cash donation receipts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/reports/all/download"
              className="rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Download All Reports PDF
            </a>
            <Link
              href="/dashboard"
              className="rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">All Receipts</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Membership</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totals.membershipTotal)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Donations</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totals.donationTotal)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Events</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totals.eventTotal)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Cash Donations</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{money(totals.cashTotal)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {receiptTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              tab === item.id ? "bg-rose-700 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {(tab === "all" || tab === "event") && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Create Event Registration Receipt</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Event Name *</label>
              <input value={eventForm.eventName} onChange={(event) => setEventForm((p) => ({ ...p, eventName: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Attendee Name *</label>
              <input value={eventForm.attendeeName} onChange={(event) => setEventForm((p) => ({ ...p, attendeeName: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Attendee Email *</label>
              <input type="email" value={eventForm.attendeeEmail} onChange={(event) => setEventForm((p) => ({ ...p, attendeeEmail: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Phone</label>
              <input value={eventForm.attendeePhone} onChange={(event) => setEventForm((p) => ({ ...p, attendeePhone: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Amount *</label>
              <input type="number" value={eventForm.amount} onChange={(event) => setEventForm((p) => ({ ...p, amount: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Mode</label>
              <select value={eventForm.paymentMode} onChange={(event) => setEventForm((p) => ({ ...p, paymentMode: event.target.value as typeof eventForm.paymentMode }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>{mode.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Reference</label>
              <input value={eventForm.paymentReference} onChange={(event) => setEventForm((p) => ({ ...p, paymentReference: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Notes</label>
              <input value={eventForm.notes} onChange={(event) => setEventForm((p) => ({ ...p, notes: event.target.value }))} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="button" disabled={busy} onClick={createEventReceipt} className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
            {busy ? "Saving..." : "Generate Event Receipt"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {showMembership && (
          <ReceiptSection title="Membership Payment Receipts" empty={!initialMembershipReceipts.length}>
            {initialMembershipReceipts.map((receipt) => (
              <ReceiptRow
                key={`membership-${receipt.id}`}
                label={receipt.memberName}
                sublabel={`${receipt.memberEmail} | ${receipt.membershipId}`}
                receiptNumber={receipt.receiptNumber}
                amount={receipt.amount}
                status={receipt.status}
                paidAt={receipt.paidAt}
                paymentMode={receipt.paymentMode}
                downloadHref={`/api/membership-receipts/${receipt.id}/download`}
              />
            ))}
          </ReceiptSection>
        )}

        {showDonation && (
          <ReceiptSection title="Donation Payment Receipts" empty={!initialDonationReceipts.length}>
            {initialDonationReceipts.map((receipt) => (
              <ReceiptRow
                key={`donation-${receipt.id}`}
                label={receipt.donorName}
                sublabel={`${receipt.donorEmail} | ${receipt.purpose}`}
                receiptNumber={receipt.receiptNumber}
                amount={receipt.amount}
                status={receipt.status}
                paidAt={receipt.paidAt}
                paymentMode={receipt.paymentMode}
                downloadHref={`/api/donations/${receipt.id}/receipt`}
              />
            ))}
          </ReceiptSection>
        )}

        {showCash && (
          <ReceiptSection title="Cash Donation Receipts" empty={!cashDonationReceipts.length}>
            {cashDonationReceipts.map((receipt) => (
              <ReceiptRow
                key={`cash-${receipt.id}`}
                label={receipt.donorName}
                sublabel={`${receipt.donorEmail} | ${receipt.purpose}`}
                receiptNumber={receipt.receiptNumber}
                amount={receipt.amount}
                status={receipt.status}
                paidAt={receipt.paidAt}
                paymentMode={receipt.paymentMode}
                downloadHref={`/api/donations/${receipt.id}/receipt`}
              />
            ))}
          </ReceiptSection>
        )}

        {showEvent && (
          <ReceiptSection title="Event Registration Receipts" empty={!eventReceipts.length}>
            {eventReceipts.map((receipt) => (
              <ReceiptRow
                key={`event-${receipt.id}`}
                label={receipt.attendeeName}
                sublabel={`${receipt.attendeeEmail} | ${receipt.eventName}`}
                receiptNumber={receipt.receiptNumber}
                amount={receipt.amount}
                status={receipt.status}
                paidAt={receipt.paidAt}
                paymentMode={receipt.paymentMode}
                downloadHref={`/api/event-registration-receipts/${receipt.id}/download`}
              />
            ))}
          </ReceiptSection>
        )}
      </div>
    </div>
  );
}

function ReceiptSection({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {empty ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            No receipts found.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ReceiptRow({
  label,
  sublabel,
  receiptNumber,
  amount,
  status,
  paidAt,
  paymentMode,
  downloadHref,
}: {
  label: string;
  sublabel: string;
  receiptNumber: string;
  amount: number;
  status: string;
  paidAt: string;
  paymentMode: string;
  downloadHref: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">{label}</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{status}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">{paymentMode}</span>
          </div>
          <p className="text-sm text-zinc-600">{sublabel}</p>
          <p className="text-xs text-zinc-500">{receiptNumber} | {shortDate(paidAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-zinc-900">{money(amount)}</span>
          <a href={downloadHref} className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
