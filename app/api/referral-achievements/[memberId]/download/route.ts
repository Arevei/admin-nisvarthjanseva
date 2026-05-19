import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateReferralAchievementCertificatePdf, safeFileName, type ReferralAchievementMember } from "@/lib/referral-achievements";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ memberId: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  const memberId = Number.parseInt((await params).memberId, 10);
  if (Number.isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  const db = await getDb();
  const member = await db.collection<ReferralAchievementMember>("members").findOne({ id: memberId });
  if (!member?.referralAchievement) {
    return NextResponse.json({ error: "Referral achievement certificate not found" }, { status: 404 });
  }

  const pdf = await generateReferralAchievementCertificatePdf(member, req.url);
  const filename = `${safeFileName(member.referralAchievement.certificateNumber)}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
