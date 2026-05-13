import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { AdminDoc } from "@/lib/types";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LoginBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const db = await getDb();
  const admins = db.collection<AdminDoc>("admins");

  const admin = await admins.findOne({ email });
  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.isAdmin = true;
  session.adminEmail = admin.email;
  session.adminId = admin.id;
  await session.save();

  return NextResponse.json({ isAdmin: true, email: admin.email });
}
