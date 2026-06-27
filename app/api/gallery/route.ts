import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { GalleryDoc } from "@/lib/types";

function normalizeImageUrls(body: Partial<GalleryDoc>) {
  return Array.from(
    new Set(
      [...(body.imageUrls ?? []), body.imageUrl]
        .map((imageUrl) => imageUrl?.trim())
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
    ),
  ).slice(0, 4);
}

function toResponse(item: GalleryDoc) {
  const imageUrls = normalizeImageUrls(item);

  return {
    id: item.id,
    imageUrl: imageUrls[0] ?? item.imageUrl,
    imageUrls,
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
  const imageUrls = normalizeImageUrls(body);
  if (imageUrls.length === 0 || !body.category) {
    return NextResponse.json({ error: "At least one cover image and category are required" }, { status: 400 });
  }

  const item: GalleryDoc = {
    id: await nextSequence("gallery"),
    imageUrl: imageUrls[0],
    imageUrls,
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
