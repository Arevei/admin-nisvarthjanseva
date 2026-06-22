import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { DonationDoc, MemberDoc } from "@/lib/types";

function normalizeEmail(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function toResponse(member: MemberDoc, donationStats = { count: 0, amount: 0 }) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    photo: member.photo ?? null,
    dateOfBirth: member.dateOfBirth ?? null,
    address: member.address,
    city: member.city,
    state: member.state,
    membershipType: member.membershipType,
    membershipId: member.membershipId,
    status: member.status,
    certificateNumber: member.certificateNumber,
    referral: member.referral ?? null,
    donationAmount: donationStats.amount,
    donationCount: donationStats.count,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const members = await db.collection<MemberDoc>("members").find({}).sort({ joinedAt: -1 }).toArray();
  const donations = await db
    .collection<DonationDoc>("donations")
    .find({
      $or: [{ status: "paid" }, { "payment.status": "paid" }, { payment: { $exists: false } }],
    })
    .toArray();
  const donationStatsByEmail = new Map<string, { count: number; amount: number }>();

  donations.forEach((donation) => {
    const email = normalizeEmail(donation.donorEmail);
    if (!email) return;
    const existing = donationStatsByEmail.get(email) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += donation.amount;
    donationStatsByEmail.set(email, existing);
  });

  return NextResponse.json(members.map((member) => toResponse(member, donationStatsByEmail.get(normalizeEmail(member.email)))));
}
