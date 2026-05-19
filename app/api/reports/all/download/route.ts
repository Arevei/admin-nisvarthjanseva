import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateReceiptReportPdf, safeFileName } from "@/lib/receipt-documents";
import { getSession } from "@/lib/session";
import type { DonationDoc, EventRegistrationReceiptDoc, MemberDoc } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const [members, donations, eventReceipts] = await Promise.all([
    db.collection<MemberDoc>("members").find({}).sort({ joinedAt: -1 }).toArray(),
    db.collection<DonationDoc>("donations").find({}).sort({ createdAt: -1 }).toArray(),
    db.collection<EventRegistrationReceiptDoc>("eventRegistrationReceipts").find({}).sort({ createdAt: -1 }).toArray(),
  ]);

  const pdf = generateReceiptReportPdf({ members, donations, eventReceipts });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(`all-reports-${new Date().toISOString().slice(0, 10)}`)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
