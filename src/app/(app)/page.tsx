"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import StatTile from "@/components/StatTile";

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
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Workspace overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Good morning</h1>
          <p className="mt-1 text-sm text-muted">Here is what is happening across your counter today.</p>
        </div>
        <Link href="/sale" className="shadow-button-accent inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark">
          <Icon name="plus" size={17} /> New sale
        </Link>
      </header>

      {demo && !loading && !loadError && (
        <p className="mb-6 rounded-2xl border border-warn/30 bg-warn-bg px-3 py-2 text-xs text-warn">
          Demo mode: showing sample data, not the real Supabase database. Sales recorded
          here only change this in-memory copy (resets on server restart) until Supabase
          credentials are set in .env.local / Vercel.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={<Icon name="box" size={20} />} label="Products" value={totalProducts} />
          <StatTile icon={<Icon name="chart" size={20} />} label="Units in stock" value={totalUnits} />
          <StatTile
            icon={<Icon name="warning" size={20} />}
            label="Low stock"
            value={lowStockCount}
            tone={lowStockCount > 0 ? "warn" : "default"}
          />
          <StatTile
            icon={<Icon name="money" size={20} />}
            label="Inventory value"
            value={`${currency}${inventoryValue.toLocaleString()}`}
          />
        </div>
      )}
    </main>
  );
}
