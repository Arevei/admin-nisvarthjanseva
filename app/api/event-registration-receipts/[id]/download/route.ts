import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateEventRegistrationReceiptPdf, safeFileName } from "@/lib/receipt-documents";
import { getSession } from "@/lib/session";
import type { EventRegistrationReceiptDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
  }

  const db = await getDb();
  const receipt = await db.collection<EventRegistrationReceiptDoc>("eventRegistrationReceipts").findOne({ id });
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const pdf = generateEventRegistrationReceiptPdf(receipt);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(receipt.receiptNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
