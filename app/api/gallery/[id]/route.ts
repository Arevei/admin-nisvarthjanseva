import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { GalleryDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

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

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = (await req.json()) as Partial<GalleryDoc>;
  if (!body.imageUrl || !body.category) {
    return NextResponse.json({ error: "imageUrl and category are required" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db.collection<GalleryDoc>("gallery").findOneAndUpdate(
    { id },
    {
      $set: {
        imageUrl: body.imageUrl,
        caption: body.caption || null,
        captionHindi: body.captionHindi || null,
        detailsEn: body.detailsEn || null,
        detailsHi: body.detailsHi || null,
        category: body.category,
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Gallery image not found" }, { status: 404 });
  }

  return NextResponse.json(toResponse(updated));
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
  await db.collection<GalleryDoc>("gallery").deleteOne({ id });
  return new NextResponse(null, { status: 204 });
}
