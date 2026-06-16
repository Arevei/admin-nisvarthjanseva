import { NextRequest, NextResponse } from "next/server";
import { sendSms, generateMembershipReceiptSms } from "@/lib/twilio-sms";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { MemberDoc } from "@/lib/types";

type Ctx = { params: Promise<{ memberId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const memberId = (await params).memberId;
  if (!memberId) {
    return NextResponse.json({ error: "Missing member ID" }, { status: 400 });
  }

  const db = await getDb();
  const member = await db.collection<MemberDoc>("members").findOne({ membershipId: memberId });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.phone) {
    return NextResponse.json({ error: "Member phone number not available" }, { status: 400 });
  }

  try {
    const receiptNumber = member.payment?.receipt || `MRC-${member.membershipId}`;
    const message = generateMembershipReceiptSms(member.name, member.membershipId, receiptNumber);

    console.log(`[SMS] Sending membership SMS to ${member.phone} for member ${member.membershipId}`);
    const result = await sendSms({ to: member.phone, message });

    if (!result.success) {
      console.error(`[SMS] Failed: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`[SMS] Success: ${result.sid}`);
    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error("[SMS] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
