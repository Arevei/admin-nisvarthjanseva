import { NextRequest, NextResponse } from "next/server";
import { sendSms, generateDonationReceiptSms } from "@/lib/twilio-sms";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { DonationDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
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

  if (!donation.donorPhone) {
    return NextResponse.json({ error: "Donor phone number not available" }, { status: 400 });
  }

  const message = generateDonationReceiptSms(
    donation.donorName,
    donation.amount,
    donation.receiptNumber
  );

  const result = await sendSms({ to: donation.donorPhone, message });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, sid: result.sid });
}
