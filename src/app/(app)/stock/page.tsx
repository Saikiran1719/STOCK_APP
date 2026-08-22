"use client";

import { useEffect, useMemo, useState } from "react";
import ProductAvatar from "@/components/ProductAvatar";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };

const LOW_STOCK_THRESHOLD = 10;

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

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
          return;
        }
        setProducts(data.products || []);
        setCurrency(data.currencySymbol || "");
      } catch {
        setLoadError("Failed to reach the server.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Inventory</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Stock</h1>
        <p className="mt-1 text-sm text-muted">Every product, its price, GST rate, and current stock level.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-ink">📦 {filtered.length} product{filtered.length === 1 ? "" : "s"}</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product…"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-64"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              {products.length === 0 ? "No products yet — add one from Stock Entry." : "No products match that search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <Th>Product</Th>
                    <Th align="right">Cost</Th>
                    <Th align="right">GST</Th>
                    <Th align="right">In stock</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.name} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                      <Td>
                        <div className="flex items-center gap-2 font-medium text-ink">
                          <ProductAvatar name={p.name} />
                          {p.name}
                        </div>
                      </Td>
                      <Td align="right" className="text-muted">
                        {currency}
                        {p.cost.toLocaleString()}
                      </Td>
                      <Td align="right" className="text-muted">
                        {p.gstRate}%
                      </Td>
                      <Td align="right" className="text-muted">
                        {p.stock}
                      </Td>
                      <Td>
                        <StatusPill stock={p.stock} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`whitespace-nowrap border-b border-r border-border px-4 py-3 last:border-r-0 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-r border-border px-4 py-3 last:border-r-0 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

function StatusPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-err-bg px-2.5 py-0.5 text-xs font-medium text-err">
        ✕ Out of stock
      </span>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-warn">
        ⚠ Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-medium text-ok">
      ✓ In stock
    </span>
  );
}
