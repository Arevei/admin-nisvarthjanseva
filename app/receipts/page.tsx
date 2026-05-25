import { redirect } from "next/navigation";
import { ReceiptDashboardPanel } from "@/components/admin/receipt-dashboard-panel";
import { getDb } from "@/lib/db";
import { getReceiptIdentity } from "@/lib/receipt-documents";
import { getSession } from "@/lib/session";
import type { DonationDoc, MemberDoc } from "@/lib/types";

function paidDonation(donation: DonationDoc) {
  return (donation.payment?.status || donation.status || "paid") === "paid";
}

function membershipReceiptAvailable(member: MemberDoc) {
  return member.payment?.status === "paid" || member.status === "active";
}

export default async function ReceiptsPage() {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    redirect("/login");
  }

  const db = await getDb();
  const [members, donations] = await Promise.all([
    db.collection<MemberDoc>("members").find({}).sort({ joinedAt: -1 }).toArray(),
    db.collection<DonationDoc>("donations").find({}).sort({ createdAt: -1 }).toArray(),
  ]);

  const initialMembershipReceipts = members.filter(membershipReceiptAvailable).map((member) => {
    const receipt = getReceiptIdentity("membership", member);
    return {
      id: member.id,
      memberName: member.name,
      memberEmail: member.email,
      membershipId: member.membershipId,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      status: receipt.status,
      paymentMode: receipt.paymentMode,
      paidAt: new Date(receipt.paidAt).toISOString(),
    };
  });

  const initialDonationReceipts = donations.filter(paidDonation).map((donation) => {
    const receipt = getReceiptIdentity("donation", donation);
    return {
      id: donation.id,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      status: receipt.status,
      paymentMode: receipt.paymentMode,
      purpose: donation.purpose,
      paidAt: new Date(receipt.paidAt).toISOString(),
    };
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <ReceiptDashboardPanel
          initialMembershipReceipts={initialMembershipReceipts}
          initialDonationReceipts={initialDonationReceipts}
        />
      </div>
    </main>
  );
}
