"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Message = { type: "ok" | "error"; text: string };

const LOW_STOCK_THRESHOLD = 10;

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [demo, setDemo] = useState(false);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
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
      const list: Product[] = data.products || [];
      setProducts(list);
      setDemo(Boolean(data.demo));
      setCurrency(data.currencySymbol || "");
      setSelected((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
    } catch {
      setLoadError("Failed to reach the server.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const currentProduct = products.find((p) => p.name === selected);
  const maxQty = currentProduct?.stock ?? 0;

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selected, qty, customerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Order failed." });
        return;
      }
      if (data.orderId != null) {
        // Take the user straight to the invoice/billing screen.
        router.push(`/invoice/${data.orderId}`);
        return;
      }
      setMessage({
        type: "error",
        text: `Order placed (stock updated), but the invoice record failed to save — no invoice to show.`,
      });
      setQty(1);
      setCustomerName("");
      await loadProducts();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Warehouse stock overview and order entry.</p>
      </header>

      {demo && !loading && !loadError && (
        <p className="mb-6 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo mode: showing sample data, not the real Supabase database. Orders placed here
          only change this in-memory copy (resets on server restart) until Supabase
          credentials are set in .env.local / Vercel.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiTile label="Products" value={totalProducts} />
            <KpiTile label="Units in stock" value={totalUnits} />
            <KpiTile
              label="Low stock"
              value={lowStockCount}
              tone={lowStockCount > 0 ? "warn" : "default"}
            />
            <KpiTile label="Inventory value" value={`${currency}${inventoryValue.toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Place order</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="product">
                    Product
                  </label>
                  <select
                    id="product"
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setQty(1);
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name} disabled={p.stock <= 0}>
                        {p.name} — {p.stock} in stock
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="qty">
                    Quantity
                  </label>
                  <input
                    id="qty"
                    type="number"
                    min={1}
                    max={maxQty || undefined}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">{maxQty} available</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="customer">
                    Customer / Bill to <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="customer"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Shown on the invoice"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !currentProduct || qty < 1 || qty > maxQty}
                  className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? "Placing order…" : "Place order"}
                </button>
              </form>

              {message && (
                <p className={`mt-4 text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                  {message.text}
                </p>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Stock</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-5 py-3">Product</th>
                      <th className="whitespace-nowrap px-5 py-3">Cost</th>
                      <th className="whitespace-nowrap px-5 py-3">GST</th>
                      <th className="whitespace-nowrap px-5 py-3">In stock</th>
                      <th className="whitespace-nowrap px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.name} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{p.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {currency}
                          {p.cost.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{p.gstRate}%</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{p.stock}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <StatusPill stock={p.stock} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function KpiTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "warn" ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Out of stock
      </span>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Low stock
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      In stock
    </span>
  );
}
