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
    <main
      className="flex min-h-screen w-full items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(at 15% 15%, rgba(45,212,191,0.22), transparent 55%), radial-gradient(at 85% 10%, rgba(52,211,153,0.16), transparent 50%), radial-gradient(at 50% 100%, rgba(45,212,191,0.10), transparent 55%), #0a1f1b",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl font-bold text-[#0a1f1b] shadow-lg shadow-teal-950/40">
            C
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
            Billing &amp; stock console
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">CounterBook</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          <h2 className="text-lg font-semibold text-stone-900">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-stone-500">Enter the access password to continue.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium text-stone-600" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="mt-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-teal-100/50">
          One shared password gets your whole team in — from any device.
        </p>
      </div>
    </main>
  );
}
