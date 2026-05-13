import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginPanel } from "@/components/admin/login-panel";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-orange-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <LoginPanel />
      </div>
    </main>
  );
}
