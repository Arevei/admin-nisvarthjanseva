import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendMembershipApprovalPaymentEmail, sendMembershipIdCardCertificateEmail } from "@/lib/email";
import type { MemberDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
type UpdateBody = {
  action?: "approve" | "activate" | "reject" | "suspend";
};

function toResponse(member: MemberDoc) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth ?? null,
    address: member.address,
    city: member.city,
    state: member.state,
    membershipType: member.membershipType,
    membershipId: member.membershipId,
    status: member.status,
    certificateNumber: member.certificateNumber,
    referral: member.referral ?? null,
    joinedAt: member.joinedAt.toISOString(),
  };
}

function statusFromAction(action: UpdateBody["action"]) {
  switch (action) {
    case "approve":
      return "payment_pending";
    case "activate":
      return "active";
    case "reject":
      return "rejected";
    case "suspend":
      return "suspended";
    default:
      return null;
  }
}

function generateCertificateNumber() {
  return `CERT-NSF-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  const body = (await req.json()) as UpdateBody;
  const newStatus = statusFromAction(body.action);
  if (!newStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = await getDb();
  const members = db.collection<MemberDoc>("members");
  const existing = await members.findOne({ id });
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const setPayload: Partial<MemberDoc> = { status: newStatus };
  if (body.action === "activate" && !existing.certificateNumber) {
    setPayload.certificateNumber = generateCertificateNumber();
  }

  const updated = await members.findOneAndUpdate({ id }, { $set: setPayload }, { returnDocument: "after" });

  if (!updated) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }

  if (body.action === "approve") {
    try {
      await sendMembershipApprovalPaymentEmail(updated);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Member approved but email failed: ${error.message}`
              : "Member approved but email failed",
          member: toResponse(updated),
        },
        { status: 207 },
      );
    }
  }

  if (body.action === "activate") {
    try {
      const requestUrl = req.headers.get("origin") || "http://localhost:3000";
      await sendMembershipIdCardCertificateEmail(updated, requestUrl);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Member activated but email failed: ${error.message}`
              : "Member activated but email failed",
          member: toResponse(updated),
        },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({ member: toResponse(updated) });
}
