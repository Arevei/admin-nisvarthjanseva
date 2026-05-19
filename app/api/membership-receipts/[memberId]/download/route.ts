import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateMembershipPaymentReceiptPdf, safeFileName } from "@/lib/receipt-documents";
import { getSession } from "@/lib/session";
import type { MemberDoc } from "@/lib/types";

type Ctx = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const memberId = Number.parseInt((await params).memberId, 10);
  if (Number.isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  const db = await getDb();
  const member = await db.collection<MemberDoc>("members").findOne({ id: memberId });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const pdf = generateMembershipPaymentReceiptPdf(member);
  const receiptNumber = member.payment?.receipt || `MRC-${member.membershipId.replace(/[^a-z0-9]+/gi, "-")}`;

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(receiptNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
