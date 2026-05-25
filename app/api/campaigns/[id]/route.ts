import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { CampaignDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function toResponse(campaign: CampaignDoc) {
  return {
    id: campaign.id,
    title: campaign.title,
    titleHindi: campaign.titleHindi,
    description: campaign.description,
    descriptionHindi: campaign.descriptionHindi,
    goalAmount: campaign.goalAmount,
    raisedAmount: campaign.raisedAmount,
    category: campaign.category,
    imageUrl: campaign.imageUrl,
    isActive: campaign.isActive,
    donorCount: campaign.donorCount,
    createdAt: campaign.createdAt.toISOString(),
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

  const body = (await req.json()) as Partial<CampaignDoc>;
  if (!body.title || !body.description || !body.category || !body.goalAmount) {
    return NextResponse.json({ error: "title, description, category and goalAmount are required" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db.collection<CampaignDoc>("campaigns").findOneAndUpdate(
    { id },
    {
      $set: {
        title: body.title,
        titleHindi: body.titleHindi || null,
        description: body.description,
        descriptionHindi: body.descriptionHindi || null,
        goalAmount: Number(body.goalAmount),
        category: body.category,
        imageUrl: body.imageUrl || null,
        isActive: body.isActive ?? true,
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
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
  await db.collection<CampaignDoc>("campaigns").deleteOne({ id });
  return new NextResponse(null, { status: 204 });
}
