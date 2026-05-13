import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  return NextResponse.json({
    isAdmin: true,
    email: session.adminEmail,
    adminId: session.adminId,
  });
}
