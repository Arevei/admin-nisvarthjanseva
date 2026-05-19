import { redirect } from "next/navigation";
import { EnquiryManagementPanel } from "@/components/admin/enquiry-management-panel";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { EnquiryDoc } from "@/lib/types";

function serializeEnquiry(enquiry: EnquiryDoc) {
  return {
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    message: enquiry.message,
    status: enquiry.status ?? "new",
    autoResponseSent: enquiry.autoResponseSent ?? false,
    autoResponseSentAt: enquiry.autoResponseSentAt?.toISOString() ?? null,
    replies: (enquiry.replies ?? []).map((reply) => ({
      ...reply,
      sentAt: reply.sentAt.toISOString(),
    })),
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt?.toISOString() ?? null,
  };
}

export default async function EnquiriesPage() {
  const session = await getSession();
  if (!session.isAdmin || !session.adminEmail) {
    redirect("/login");
  }

  const db = await getDb();
  const enquiries = await db.collection<EnquiryDoc>("contacts").find({}).sort({ createdAt: -1 }).toArray();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <EnquiryManagementPanel initialEnquiries={enquiries.map(serializeEnquiry)} />
      </div>
    </main>
  );
}
