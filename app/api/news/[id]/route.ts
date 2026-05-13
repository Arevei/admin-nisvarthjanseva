import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { NewsDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function toResponse(article: NewsDoc) {
  return {
    id: article.id,
    title: article.title,
    titleHindi: article.titleHindi,
    content: article.content,
    contentHindi: article.contentHindi,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    category: article.category,
    author: article.author,
    publishedAt: article.publishedAt.toISOString(),
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

  const body = (await req.json()) as Partial<NewsDoc>;
  if (!body.title || !body.content || !body.category) {
    return NextResponse.json({ error: "title, content and category are required" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db.collection<NewsDoc>("news").findOneAndUpdate(
    { id },
    {
      $set: {
        title: body.title,
        titleHindi: body.titleHindi || null,
        content: body.content,
        contentHindi: body.contentHindi || null,
        excerpt: body.excerpt || null,
        imageUrl: body.imageUrl || null,
        category: body.category,
        author: body.author || null,
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
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
  await db.collection<NewsDoc>("news").deleteOne({ id });
  return new NextResponse(null, { status: 204 });
}
