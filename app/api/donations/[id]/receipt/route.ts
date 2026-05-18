import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateDonationReceiptPdf, safeFileName } from "@/lib/donation-receipts";
import type { DonationDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
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

  const pdf = await generateDonationReceiptPdf(donation, req.url);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(donation.receiptNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
