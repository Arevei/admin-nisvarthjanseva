import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { DonationDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function isPaidDonation(donation: DonationDoc) {
  return donation.status === "paid" || donation.payment?.status === "paid" || !donation.payment;
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid donation ID" }, { status: 400 });
  }

  const db = await getDb();
  const donation = await db.collection<DonationDoc>("donations").findOne({ id });
  if (!donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  if (isPaidDonation(donation)) {
    return NextResponse.json({ error: "Paid donations cannot be deleted from this action." }, { status: 409 });
  }

  await db.collection<DonationDoc>("donations").deleteOne({ id });
  return new NextResponse(null, { status: 204 });
}
