import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { NewsDoc } from "@/lib/types";

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

export async function GET() {
  const db = await getDb();
  const rows = await db.collection<NewsDoc>("news").find({}).sort({ publishedAt: -1 }).toArray();
  return NextResponse.json(rows.map(toResponse));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<NewsDoc>;
  if (!body.title || !body.content || !body.category) {
    return NextResponse.json({ error: "title, content and category are required" }, { status: 400 });
  }

  const article: NewsDoc = {
    id: await nextSequence("news"),
    title: body.title,
    titleHindi: body.titleHindi || null,
    content: body.content,
    contentHindi: body.contentHindi || null,
    excerpt: body.excerpt || null,
    imageUrl: body.imageUrl || null,
    category: body.category,
    author: body.author || null,
    publishedAt: new Date(),
  };

  const db = await getDb();
  await db.collection<NewsDoc>("news").insertOne(article);

  return NextResponse.json(toResponse(article), { status: 201 });
}
