import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendVisitorCertificateEmail } from "@/lib/email";
import {
  generateVisitorCertificateNumber,
  getVisitorTemplate,
  visitorCertificateTemplates,
} from "@/lib/visitor-certificates";
import type { VisitorCertificateDoc } from "@/lib/types";

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

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const rows = await db.collection<VisitorCertificateDoc>("visitorCertificates").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(rows.map(toResponse));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<VisitorCertificateDoc>;
  if (!body.recipientName || !body.recipientEmail || !body.title || !body.description) {
    return NextResponse.json({ error: "recipientName, recipientEmail, title and description are required" }, { status: 400 });
  }

  const certificate: VisitorCertificateDoc = {
    id: await nextSequence("visitorCertificates"),
    certificateNumber: generateVisitorCertificateNumber(),
    recipientName: body.recipientName,
    recipientEmail: body.recipientEmail.trim().toLowerCase(),
    recipientPhone: body.recipientPhone || null,
    title: body.title,
    description: body.description,
    eventName: body.eventName || null,
    issuedBy: body.issuedBy || "Nisvarthjan Seva Foundation",
    templateId: getVisitorTemplate(body.templateId).id,
    status: "issued",
    issuedAt: new Date(),
    createdAt: new Date(),
  };

  const db = await getDb();
  await db.collection<VisitorCertificateDoc>("visitorCertificates").insertOne(certificate);

  let emailSent = true;
  try {
    await sendVisitorCertificateEmail(certificate, req.url);
  } catch (error) {
    emailSent = false;
    console.error("Visitor certificate email failed:", error);
  }

  return NextResponse.json({ certificate: toResponse(certificate), emailSent, templates: visitorCertificateTemplates }, { status: 201 });
}
