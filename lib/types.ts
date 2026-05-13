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
