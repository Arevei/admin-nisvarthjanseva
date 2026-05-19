"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type EnquiryStatus = "new" | "in_review" | "replied" | "closed";

type EnquiryItem = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: EnquiryStatus;
  autoResponseSent: boolean;
  autoResponseSentAt: string | null;
  replies: Array<{
    message: string;
    sentBy: string;
    sentAt: string;
  }>;
  createdAt: string;
  updatedAt: string | null;
};

const statuses: Array<{ value: "all" | EnquiryStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In Review" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

function shortDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: EnquiryStatus) {
  if (status === "new") return "bg-blue-100 text-blue-800";
  if (status === "in_review") return "bg-amber-100 text-amber-800";
  if (status === "replied") return "bg-emerald-100 text-emerald-800";
  return "bg-zinc-200 text-zinc-700";
}

export function EnquiryManagementPanel({ initialEnquiries }: { initialEnquiries: EnquiryItem[] }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EnquiryStatus>("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(initialEnquiries[0]?.id ?? null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const filteredEnquiries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        enquiry.name.toLowerCase().includes(normalizedQuery) ||
        enquiry.email.toLowerCase().includes(normalizedQuery) ||
        enquiry.phone?.toLowerCase().includes(normalizedQuery) ||
        enquiry.message.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [enquiries, query, statusFilter]);

  const totals = useMemo(
    () => ({
      total: enquiries.length,
      new: enquiries.filter((enquiry) => enquiry.status === "new").length,
      replied: enquiries.filter((enquiry) => enquiry.status === "replied").length,
      closed: enquiries.filter((enquiry) => enquiry.status === "closed").length,
    }),
    [enquiries],
  );

  const updateEnquiry = async (id: number, body: { status?: EnquiryStatus; replyMessage?: string }) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string; enquiry?: EnquiryItem };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update enquiry");
      }
      if (payload.enquiry) {
        setEnquiries((current) => current.map((item) => (item.id === id ? payload.enquiry! : item)));
      }
      if (body.replyMessage) {
        setReplyDrafts((current) => ({ ...current, [id]: "" }));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update enquiry");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-rose-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Enquiry Management
            </p>
            <h1 className="mt-3 text-3xl font-bold">Website Enquiries</h1>
            <p className="mt-1 text-sm text-rose-100">
              View, search, filter, and reply to website enquiries directly by email.
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

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Enquiries</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.total}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">New</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.new}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Replied</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.replied}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Closed</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totals.closed}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Search enquiries</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, phone, or message"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Filter status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {filteredEnquiries.map((enquiry) => {
          const expanded = expandedId === enquiry.id;
          return (
            <div key={enquiry.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-900">{enquiry.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(enquiry.status)}`}>
                      {enquiry.status.replace("_", " ")}
                    </span>
                    {enquiry.autoResponseSent && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        auto response sent
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600">{enquiry.email} | {enquiry.phone || "No phone"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{enquiry.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">Received {shortDate(enquiry.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : enquiry.id)}
                    className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                  >
                    {expanded ? "Hide" : "Open"}
                  </button>
                  <select
                    value={enquiry.status}
                    disabled={busyId === enquiry.id}
                    onChange={(event) => updateEnquiry(enquiry.id, { status: event.target.value as EnquiryStatus })}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700"
                  >
                    {statuses.filter((status) => status.value !== "all").map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {expanded && (
                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <div className="rounded-lg bg-zinc-50 p-4">
                    <h4 className="text-sm font-semibold text-zinc-900">Original Enquiry</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{enquiry.message}</p>
                  </div>

                  {enquiry.replies.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-zinc-900">Reply History</h4>
                      {enquiry.replies.map((reply, index) => (
                        <div key={`${reply.sentAt}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                          <p className="whitespace-pre-wrap text-sm text-zinc-700">{reply.message}</p>
                          <p className="mt-2 text-xs text-zinc-500">Sent by {reply.sentBy} on {shortDate(reply.sentAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Reply by email</label>
                    <textarea
                      value={replyDrafts[enquiry.id] ?? ""}
                      onChange={(event) => setReplyDrafts((current) => ({ ...current, [enquiry.id]: event.target.value }))}
                      className="h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      placeholder="Write reply message..."
                    />
                    <button
                      type="button"
                      disabled={busyId === enquiry.id || !(replyDrafts[enquiry.id] ?? "").trim()}
                      onClick={() => updateEnquiry(enquiry.id, { replyMessage: replyDrafts[enquiry.id] })}
                      className="mt-3 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                    >
                      {busyId === enquiry.id ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEnquiries.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            No enquiries found for the selected search and filter.
          </div>
        )}
      </div>
    </div>
  );
}
