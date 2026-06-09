import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDefaultLanguage, setDefaultLanguage, type SiteLanguage } from "@/lib/site-settings";

export async function GET() {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const defaultLanguage = await getDefaultLanguage();
  return NextResponse.json({ defaultLanguage });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as { defaultLanguage?: SiteLanguage };
  if (body.defaultLanguage !== "en" && body.defaultLanguage !== "hi") {
    return NextResponse.json({ error: "defaultLanguage must be 'en' or 'hi'" }, { status: 400 });
  }

  await setDefaultLanguage(body.defaultLanguage);
  return NextResponse.json({ defaultLanguage: body.defaultLanguage });
}
