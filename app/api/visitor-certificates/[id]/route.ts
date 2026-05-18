import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { VisitorCertificateDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function toResponse(certificate: VisitorCertificateDoc) {
  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    recipientName: certificate.recipientName,
    recipientEmail: certificate.recipientEmail,
    recipientPhone: certificate.recipientPhone,
    title: certificate.title,
    description: certificate.description,
    eventName: certificate.eventName,
    issuedBy: certificate.issuedBy,
    templateId: certificate.templateId,
    status: certificate.status,
    issuedAt: certificate.issuedAt.toISOString(),
    createdAt: certificate.createdAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = (await req.json()) as { status?: "issued" | "revoked" };
  if (body.status !== "issued" && body.status !== "revoked") {
    return NextResponse.json({ error: "status must be issued or revoked" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db.collection<VisitorCertificateDoc>("visitorCertificates").findOneAndUpdate(
    { id },
    { $set: { status: body.status } },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  return NextResponse.json({ certificate: toResponse(updated) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection<VisitorCertificateDoc>("visitorCertificates").deleteOne({ id });
  return new NextResponse(null, { status: 204 });
}
