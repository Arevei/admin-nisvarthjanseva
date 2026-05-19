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
  dateOfBirth?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  membershipType: "general" | "active" | "lifetime";
  membershipId: string;
  status: string;
  certificateNumber: string | null;
  referral?: ReferralInfo | null;
  referralAchievement?: ReferralAchievement | null;
  birthdayWishYears?: number[];
  password?: string;
  passwordHash?: string;
  payment?: {
    mode?: "manual" | "razorpay";
    status?: string;
    amount?: number;
    currency?: string;
    orderId?: string;
    paymentId?: string;
    receipt?: string;
    paidAt?: Date;
    createdAt?: Date;
  };
  joinedAt: Date;
}

export type ReferralAchievementTier = "silver" | "gold" | "platinum" | "diamond";

export interface ReferralAchievement {
  tier: ReferralAchievementTier;
  certificateNumber: string;
  donationAmount: number;
  thresholdAmount: number;
  issuedAt: Date;
  updatedAt?: Date;
  source: "automatic" | "admin";
  emailSent?: boolean;
  lastEmailSentAt?: Date;
}

export interface ReferralInfo {
  code: string;
  memberId: number;
  membershipId: string;
  memberName: string;
  referredAt: Date;
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
  referral?: ReferralInfo | null;
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

export interface EventRegistrationReceiptDoc {
  id: number;
  receiptNumber: string;
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  amount: number;
  status: "paid" | "cancelled" | "refunded";
  payment: {
    mode: "cash" | "upi" | "bank_transfer" | "other" | "manual";
    reference?: string | null;
    paidAt: Date;
  };
  notes: string | null;
  createdAt: Date;
}

export interface EnquiryReplyDoc {
  message: string;
  sentBy: string;
  sentAt: Date;
}

export interface EnquiryDoc {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "in_review" | "replied" | "closed";
  autoResponseSent?: boolean;
  autoResponseSentAt?: Date;
  replies?: EnquiryReplyDoc[];
  createdAt: Date;
  updatedAt?: Date;
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
