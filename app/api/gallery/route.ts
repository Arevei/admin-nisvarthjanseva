import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { GalleryDoc } from "@/lib/types";

function toResponse(item: GalleryDoc) {
  return {
    id: item.id,
    imageUrl: item.imageUrl,
    caption: item.caption,
    captionHindi: item.captionHindi,
    detailsEn: item.detailsEn,
    detailsHi: item.detailsHi,
    category: item.category,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET() {
  const db = await getDb();
  const rows = await db.collection<GalleryDoc>("gallery").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(rows.map(toResponse));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<GalleryDoc>;
  if (!body.imageUrl || !body.category) {
    return NextResponse.json({ error: "imageUrl and category are required" }, { status: 400 });
  }

  const item: GalleryDoc = {
    id: await nextSequence("gallery"),
    imageUrl: body.imageUrl,
    caption: body.caption || null,
    captionHindi: body.captionHindi || null,
    detailsEn: body.detailsEn || null,
    detailsHi: body.detailsHi || null,
    category: body.category,
    createdAt: new Date(),
  };

  const db = await getDb();
  await db.collection<GalleryDoc>("gallery").insertOne(item);

  return NextResponse.json(toResponse(item), { status: 201 });
}
