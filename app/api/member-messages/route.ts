import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { MemberMessageDoc } from "@/lib/types";

function toResponse(message: MemberMessageDoc) {
  return {
    id: message.id,
    title: message.title,
    message: message.message,
    isActive: message.isActive,
    createdBy: message.createdBy,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const db = await getDb();
  const latest = await db.collection<MemberMessageDoc>("memberMessages").findOne({}, { sort: { createdAt: -1 } });
  return NextResponse.json({ message: latest ? toResponse(latest) : null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as { title?: string; message?: string; isActive?: boolean };
  const title = body.title?.trim() || "Foundation Update";
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const doc: MemberMessageDoc = {
    id: await nextSequence("memberMessages"),
    title,
    message,
    isActive: body.isActive ?? true,
    createdBy: session.adminEmail,
    createdAt: new Date(),
  };

  const db = await getDb();
  await db.collection<MemberMessageDoc>("memberMessages").insertOne(doc);
  return NextResponse.json({ message: toResponse(doc) }, { status: 201 });
}
