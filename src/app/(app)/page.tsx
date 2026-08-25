"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };

const LOW_STOCK_THRESHOLD = 10;

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [demo, setDemo] = useState(false);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/products");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error || "Failed to load products.");
          setProducts([]);
          return;
        }
        setProducts(data.products || []);
        setDemo(Boolean(data.demo));
        setCurrency(data.currencySymbol || "");
      } catch {
        setLoadError("Failed to reach the server.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Overview</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Stock overview and billing.</p>
      </header>

      {demo && !loading && !loadError && (
        <p className="mb-6 rounded-xl border border-warn/30 bg-warn-bg px-3 py-2 text-xs text-warn">
          Demo mode: showing sample data, not the real Supabase database. Sales recorded
          here only change this in-memory copy (resets on server restart) until Supabase
          credentials are set in .env.local / Vercel.
        </p>
      )}

      <Link
        href="/sale"
        className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 py-4 text-white shadow-[0_4px_16px_-4px_rgba(10,110,209,0.4)] transition hover:shadow-[0_6px_20px_-4px_rgba(10,110,209,0.5)]"
      >
        <span>
          <span className="block text-sm font-semibold">🛒 Start a new sale</span>
          <span className="block text-xs text-white/80">Build a bill and print a GST invoice</span>
        </span>
        <span aria-hidden className="text-xl">
          →
        </span>
      </Link>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiTile icon="📦" label="Products" value={totalProducts} />
          <KpiTile icon="📊" label="Units in stock" value={totalUnits} />
          <KpiTile
            icon="⚠️"
            label="Low stock"
            value={lowStockCount}
            tone={lowStockCount > 0 ? "warn" : "default"}
          />
          <KpiTile
            icon="💰"
            label="Inventory value"
            value={`${currency}${inventoryValue.toLocaleString()}`}
          />
        </div>
      )}
    </main>
  );
}

function KpiTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: string;
  label: string;
  value: string | number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${
          tone === "warn" ? "bg-warn-bg" : "bg-accent-soft"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p
          className={`mt-0.5 truncate text-2xl font-bold tabular-nums ${
            tone === "warn" ? "text-warn" : "text-ink"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
