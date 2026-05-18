import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateVisitorCertificatePdf, safeFileName } from "@/lib/visitor-certificates";
import type { VisitorCertificateDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const db = await getDb();
  const certificate = await db.collection<VisitorCertificateDoc>("visitorCertificates").findOne({ id });
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const pdf = await generateVisitorCertificatePdf(certificate, req.url);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(certificate.certificateNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
