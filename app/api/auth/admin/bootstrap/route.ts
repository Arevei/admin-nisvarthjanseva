import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb, nextSequence } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { AdminDoc } from "@/lib/types";

type BootstrapBody = {
  email?: string;
  password?: string;
  bootstrapKey?: string;
};

export async function GET() {
  const db = await getDb();
  const adminCount = await db.collection<AdminDoc>("admins").countDocuments({});
  return NextResponse.json({ needsBootstrap: adminCount === 0 });
}

export async function POST(req: NextRequest) {
  const configuredBootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY;
  if (!configuredBootstrapKey) {
    return NextResponse.json({ error: "ADMIN_BOOTSTRAP_KEY is not configured" }, { status: 500 });
  }

  const body = (await req.json()) as BootstrapBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const bootstrapKey = body.bootstrapKey?.trim();

  if (!email || !password || !bootstrapKey) {
    return NextResponse.json({ error: "email, password and bootstrapKey are required" }, { status: 400 });
  }

  if (bootstrapKey !== configuredBootstrapKey) {
    return NextResponse.json({ error: "Invalid bootstrap key" }, { status: 401 });
  }

  const db = await getDb();
  const admins = db.collection<AdminDoc>("admins");
  const adminCount = await admins.countDocuments({});
  if (adminCount > 0) {
    return NextResponse.json({ error: "Bootstrap already completed" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const admin: AdminDoc = {
    id: await nextSequence("admins"),
    email,
    passwordHash,
    isActive: true,
    createdAt: new Date(),
  };

  await admins.insertOne(admin);

  const session = await getSession();
  session.isAdmin = true;
  session.adminEmail = admin.email;
  session.adminId = admin.id;
  await session.save();

  return NextResponse.json({ isAdmin: true, email: admin.email, bootstrapCompleted: true });
}
