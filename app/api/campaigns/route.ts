import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { CampaignDoc } from "@/lib/types";

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

export async function GET() {
  const db = await getDb();
  const rows = await db.collection<CampaignDoc>("campaigns").find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(rows.map(toResponse));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<CampaignDoc>;
  if (!body.title || !body.description || !body.category || !body.goalAmount) {
    return NextResponse.json({ error: "title, description, category and goalAmount are required" }, { status: 400 });
  }

  const campaign: CampaignDoc = {
    id: await nextSequence("campaigns"),
    title: body.title,
    titleHindi: body.titleHindi || null,
    description: body.description,
    descriptionHindi: body.descriptionHindi || null,
    goalAmount: Number(body.goalAmount),
    raisedAmount: 0,
    category: body.category,
    imageUrl: body.imageUrl || null,
    isActive: body.isActive ?? true,
    donorCount: 0,
    createdAt: new Date(),
  };

  const db = await getDb();
  await db.collection<CampaignDoc>("campaigns").insertOne(campaign);
  return NextResponse.json(toResponse(campaign), { status: 201 });
}
