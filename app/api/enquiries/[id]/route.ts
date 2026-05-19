import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEnquiryReplyEmail } from "@/lib/email";
import { getSession } from "@/lib/session";
import type { EnquiryDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
type UpdateBody = {
  status?: EnquiryDoc["status"];
  replyMessage?: string;
};

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

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid enquiry ID" }, { status: 400 });
  }

  const body = (await req.json()) as UpdateBody;
  const db = await getDb();
  const enquiries = db.collection<EnquiryDoc>("contacts");
  const existing = await enquiries.findOne({ id });
  if (!existing) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  let emailSent = false;
  const setPayload: Partial<EnquiryDoc> = {
    updatedAt: new Date(),
  };
  if (body.status) {
    setPayload.status = body.status;
  }

  const updatePayload: Record<string, unknown> = { $set: setPayload };
  const replyMessage = body.replyMessage?.trim();
  if (replyMessage) {
    await sendEnquiryReplyEmail(existing, replyMessage);
    emailSent = true;
    setPayload.status = "replied";
    updatePayload.$set = setPayload;
    updatePayload.$push = {
      replies: {
        message: replyMessage,
        sentBy: session.adminEmail,
        sentAt: new Date(),
      },
    };
  }

  const updated = await enquiries.findOneAndUpdate({ id }, updatePayload, { returnDocument: "after" });
  if (!updated) {
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 });
  }

  return NextResponse.json({ enquiry: toResponse(updated), emailSent });
}
