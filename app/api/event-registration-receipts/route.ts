import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { EventRegistrationReceiptDoc } from "@/lib/types";

function generateReceiptNumber() {
  return `EVT-NSF-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function toResponse(receipt: EventRegistrationReceiptDoc) {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    eventName: receipt.eventName,
    attendeeName: receipt.attendeeName,
    attendeeEmail: receipt.attendeeEmail,
    attendeePhone: receipt.attendeePhone,
    amount: receipt.amount,
    status: receipt.status,
    paymentMode: receipt.payment.mode,
    paymentReference: receipt.payment.reference ?? null,
    paidAt: receipt.payment.paidAt.toISOString(),
    notes: receipt.notes,
    createdAt: receipt.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const receipts = await db
    .collection<EventRegistrationReceiptDoc>("eventRegistrationReceipts")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(receipts.map(toResponse));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as {
    eventName?: string;
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
    amount?: number;
    paymentMode?: "cash" | "upi" | "bank_transfer" | "other" | "manual";
    paymentReference?: string;
    notes?: string;
  };
  const amount = Number(body.amount);

  if (!body.eventName || !body.attendeeName || !body.attendeeEmail || !amount || amount <= 0) {
    return NextResponse.json({ error: "eventName, attendeeName, attendeeEmail and amount are required" }, { status: 400 });
  }

  const db = await getDb();
  const receipt: EventRegistrationReceiptDoc = {
    id: await nextSequence("eventRegistrationReceipts"),
    receiptNumber: generateReceiptNumber(),
    eventName: body.eventName,
    attendeeName: body.attendeeName,
    attendeeEmail: body.attendeeEmail.trim().toLowerCase(),
    attendeePhone: body.attendeePhone || null,
    amount,
    status: "paid",
    payment: {
      mode: body.paymentMode || "cash",
      reference: body.paymentReference || null,
      paidAt: new Date(),
    },
    notes: body.notes || null,
    createdAt: new Date(),
  };

  await db.collection<EventRegistrationReceiptDoc>("eventRegistrationReceipts").insertOne(receipt);
  return NextResponse.json(toResponse(receipt), { status: 201 });
}
