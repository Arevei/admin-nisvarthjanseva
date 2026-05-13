"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BootstrapStatus = {
  needsBootstrap: boolean;
};

export function LoginPanel() {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/auth/admin/bootstrap", { credentials: "include" });
        const payload = (await response.json()) as BootstrapStatus;
        setNeedsBootstrap(Boolean(payload.needsBootstrap));
      } catch {
        setError("Failed to check bootstrap status.");
      } finally {
        setLoadingStatus(false);
      }
    };
    run();
  }, []);

  const submitLogin = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Login failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBootstrap = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, bootstrapKey }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Bootstrap failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bootstrap failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingStatus) {
    return <p className="text-sm text-zinc-500">Checking setup...</p>;
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 shadow-xl">
      <div className="mb-5">
        <p className="inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
          Nisvarthjan Admin
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          {needsBootstrap ? "Set First Admin" : "Admin Login"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {needsBootstrap
            ? "Create your first administrator account for this project."
            : "Login to manage campaigns and news."}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
            placeholder="admin@nisvarthjan.org"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
            placeholder="Enter password"
          />
        </div>

        {needsBootstrap && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Bootstrap Key</label>
            <input
              type="password"
              value={bootstrapKey}
              onChange={(event) => setBootstrapKey(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
              placeholder="ADMIN_BOOTSTRAP_KEY"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={needsBootstrap ? submitBootstrap : submitLogin}
          className="w-full rounded-md bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Please wait..." : needsBootstrap ? "Create First Admin" : "Login"}
        </button>
      </div>
    </div>
  );
}
