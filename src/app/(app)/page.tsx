"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ProductAvatar from "@/components/ProductAvatar";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type CartItem = { name: string; qty: number };
type Message = { type: "ok" | "error"; text: string };

const LOW_STOCK_THRESHOLD = 10;

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [demo, setDemo] = useState(false);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickProduct, setPickProduct] = useState("");
  const [pickQty, setPickQty] = useState(1);
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
      setPickProduct((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
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

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

  function remainingStock(name: string) {
    const product = products.find((p) => p.name === name);
    if (!product) return 0;
    const reserved = cart.filter((c) => c.name === name).reduce((sum, c) => sum + c.qty, 0);
    return product.stock - reserved;
  }

  function lineTotal(item: CartItem) {
    const product = products.find((p) => p.name === item.name);
    if (!product) return { unitCost: 0, subtotal: 0, gst: 0, total: 0 };
    const subtotal = product.cost * item.qty;
    const gst = (subtotal * product.gstRate) / 100;
    return { unitCost: product.cost, subtotal, gst, total: subtotal + gst };
  }

  const cartTotal = cart.reduce((sum, item) => sum + lineTotal(item).total, 0);
  const pickAvailable = remainingStock(pickProduct);

  function addItem() {
    if (!pickProduct || pickQty < 1 || pickQty > pickAvailable) return;
    setCart((prev) => [...prev, { name: pickProduct, qty: pickQty }]);
    setPickQty(1);
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = cart.length > 0 && customerName.trim().length > 0 && customerAddress.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerAddress,
          items: cart.map((c) => ({ name: c.name, qty: c.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Order failed." });
        return;
      }
      if (data.invoiceId != null) {
        // Take the user straight to the invoice/billing screen.
        router.push(`/invoices/${data.invoiceId}`);
        return;
      }
      setMessage({ type: "error", text: "Order placed, but no invoice was returned." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Overview</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">Stock overview and order entry.</p>
      </header>

      {demo && !loading && !loadError && (
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo mode: showing sample data, not the real Supabase database. Orders placed here
          only change this in-memory copy (resets on server restart) until Supabase
          credentials are set in .env.local / Vercel.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-md lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-stone-900">🛒 Place order</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="customer">
                    Customer name
                  </label>
                  <input
                    id="customer"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder="Shown on the invoice"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="customer-address">
                    Customer address
                  </label>
                  <textarea
                    id="customer-address"
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder="Billing address, shown on the invoice"
                  />
                </div>

                <div className="rounded-xl border border-stone-200 p-3">
                  <p className="mb-2 text-xs font-medium text-stone-600">Add item</p>
                  <select
                    value={pickProduct}
                    onChange={(e) => {
                      setPickProduct(e.target.value);
                      setPickQty(1);
                    }}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name} disabled={remainingStock(p.name) <= 0}>
                        {p.name} — {remainingStock(p.name)} available
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={pickAvailable || undefined}
                      value={pickQty}
                      onChange={(e) => setPickQty(Number(e.target.value))}
                      className="w-20 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    />
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!pickProduct || pickQty < 1 || pickQty > pickAvailable}
                      className="flex-1 whitespace-nowrap rounded-xl border border-teal-600 px-3 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 disabled:opacity-50"
                    >
                      Add item
                    </button>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    {cart.map((item, i) => {
                      const line = lineTotal(item);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2 text-sm last:border-0"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ProductAvatar name={item.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-stone-900">
                                {item.name} × {item.qty}
                              </p>
                              <p className="text-xs text-stone-500">
                                {currency}
                                {line.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            aria-label={`Remove ${item.name}`}
                            className="shrink-0 rounded-xl px-2 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900">
                      <span>Total</span>
                      <span>
                        {currency}
                        {cartTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
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

            <section className="rounded-2xl border border-stone-100 bg-white shadow-md lg:col-span-3">
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-stone-900">📦 Stock</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                      <th className="whitespace-nowrap px-5 py-3">Product</th>
                      <th className="whitespace-nowrap px-5 py-3">Cost</th>
                      <th className="whitespace-nowrap px-5 py-3">GST</th>
                      <th className="whitespace-nowrap px-5 py-3">In stock</th>
                      <th className="whitespace-nowrap px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.name} className="border-b border-stone-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center gap-2 font-medium text-stone-900">
                            <ProductAvatar name={p.name} />
                            {p.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-stone-600">
                          {currency}
                          {p.cost.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-stone-600">{p.gstRate}%</td>
                        <td className="whitespace-nowrap px-5 py-3 text-stone-600">{p.stock}</td>
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
    <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
          tone === "warn" ? "bg-amber-50" : "bg-teal-50"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <p
          className={`mt-0.5 text-2xl font-bold tabular-nums ${
            tone === "warn" ? "text-amber-600" : "text-stone-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        ✕ Out of stock
      </span>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        ⚠ Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      ✓ In stock
    </span>
  );
}
