import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { MemberDoc } from "@/lib/types";

function toResponse(member: MemberDoc) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth ?? null,
    address: member.address,
    city: member.city,
    state: member.state,
    membershipType: member.membershipType,
    membershipId: member.membershipId,
    status: member.status,
    certificateNumber: member.certificateNumber,
    referral: member.referral ?? null,
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
  return NextResponse.json(members.map(toResponse));
}
