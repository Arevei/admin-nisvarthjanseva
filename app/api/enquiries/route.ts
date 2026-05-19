import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { EnquiryDoc } from "@/lib/types";

function toResponse(enquiry: EnquiryDoc) {
  return {
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    message: enquiry.message,
    status: enquiry.status ?? "new",
    autoResponseSent: enquiry.autoResponseSent ?? false,
    autoResponseSentAt: enquiry.autoResponseSentAt?.toISOString() ?? null,
    replies: (enquiry.replies ?? []).map((reply) => ({
      ...reply,
      sentAt: reply.sentAt.toISOString(),
    })),
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const enquiries = await db.collection<EnquiryDoc>("contacts").find({}).sort({ createdAt: -1 }).toArray();

  return NextResponse.json(enquiries.map(toResponse));
}
