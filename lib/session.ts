import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isAdmin?: boolean;
  adminId?: number;
  adminEmail?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "change_this_session_secret_in_env",
  cookieName: "nisvarthjan_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
