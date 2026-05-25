import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { MemberMessageDoc } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const db = await getDb();
  const updated = await db.collection<MemberMessageDoc>("memberMessages").findOneAndUpdate(
    { id },
    {
      $set: {
        isActive: false,
        deletedBy: session.adminEmail,
        deletedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
