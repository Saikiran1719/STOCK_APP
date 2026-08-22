"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-navy to-navy-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gold text-2xl font-bold text-navy shadow-lg">
            C
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Billing &amp; stock console
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">CounterBook</h1>
        </div>

        <div className="rounded-xl border-t-4 border-gold bg-card p-6 shadow-2xl sm:p-8">
          <h2 className="text-lg font-semibold text-ink">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Enter the access password to continue.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium text-muted" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {error && <p className="text-sm text-err">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="mt-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          One shared password gets your whole team in — from any device.
        </p>
      </div>
    </main>
  );
}
