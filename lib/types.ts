export interface NewsDoc {
  id: number;
  title: string;
  titleHindi: string | null;
  content: string;
  contentHindi: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  category: string;
  author: string | null;
  publishedAt: Date;
}

export interface CampaignDoc {
  id: number;
  title: string;
  titleHindi: string | null;
  description: string;
  descriptionHindi: string | null;
  goalAmount: number;
  raisedAmount: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  donorCount: number;
  createdAt: Date;
}

export interface AdminDoc {
  id: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MemberDoc {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  membershipType: "general" | "active" | "lifetime";
  membershipId: string;
  status: string;
  certificateNumber: string | null;
  password?: string;
  passwordHash?: string;
  joinedAt: Date;
}

export interface DonationDoc {
  id: number;
  amount: number;
  donorName: string;
  donorEmail: string;
  donorPhone?: string | null;
  campaignId?: number | null;
  purpose: string;
  receiptNumber: string;
  status?: string;
  payment?: {
    mode?: "manual" | "razorpay" | "cash" | "upi" | "bank_transfer" | "other";
    status?: string;
    amount?: number;
    currency?: string;
    orderId?: string;
    paymentId?: string;
    receipt?: string;
    paidAt?: Date;
    createdAt?: Date;
  };
  createdAt: Date;
}

export interface GalleryDoc {
  id: number;
  imageUrl: string;
  caption: string | null;
  captionHindi: string | null;
  detailsEn: string | null;
  detailsHi: string | null;
  category: string;
  createdAt: Date;
}

export type VisitorCertificateTemplate = "classic" | "heritage" | "service" | "impact" | "appreciation" | "modern";

export interface VisitorCertificateDoc {
  id: number;
  certificateNumber: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  title: string;
  description: string;
  eventName: string | null;
  issuedBy: string | null;
  templateId: VisitorCertificateTemplate;
  status: "issued" | "revoked";
  issuedAt: Date;
  createdAt: Date;
}
