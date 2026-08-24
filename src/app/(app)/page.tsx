"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ProductAvatar from "@/components/ProductAvatar";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Party = { id: number; name: string; address: string };
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

  const [parties, setParties] = useState<Party[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [partyId, setPartyId] = useState<number | undefined>(undefined);
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
    fetch("/api/parties")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.parties) setParties(data.parties);
      })
      .catch(() => {});
  }, []);

  function handleCustomerNameChange(value: string) {
    setCustomerName(value);
    const match = parties.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setPartyId(match.id);
      setCustomerAddress(match.address);
    } else {
      setPartyId(undefined);
    }
  }

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
          partyId,
          items: cart.map((c) => ({ name: c.name, qty: c.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Sale failed." });
        return;
      }
      if (data.invoiceId != null) {
        // Take the user straight to the invoice/billing screen.
        router.push(`/invoices/${data.invoiceId}`);
        return;
      }
      setMessage({ type: "error", text: "Sale recorded, but no invoice was returned." });
    } finally {
      setSubmitting(false);
    }
  }

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

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <section className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
            <h2 className="mb-4 text-sm font-semibold text-ink">🛒 New sale</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="customer">
                  Customer name
                </label>
                <input
                  id="customer"
                  type="text"
                  list="party-options"
                  required
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Pick a saved party, or type a new customer"
                />
                <datalist id="party-options">
                  {parties.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {partyId && <p className="mt-1 text-xs text-ok">✓ Existing party — address filled in below.</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="customer-address">
                  Customer address
                </label>
                <textarea
                  id="customer-address"
                  required
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Billing address, shown on the invoice"
                />
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted">Add item</p>
                <select
                  value={pickProduct}
                  onChange={(e) => {
                    setPickProduct(e.target.value);
                    setPickQty(1);
                  }}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                    className="w-20 rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!pickProduct || pickQty < 1 || pickQty > pickAvailable}
                    className="flex-1 whitespace-nowrap rounded-lg border border-accent px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-45"
                  >
                    Add item
                  </button>
                </div>
              </div>

              {cart.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  {cart.map((item, i) => {
                    const line = lineTotal(item);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-0"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ProductAvatar name={item.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {item.name} × {item.qty}
                            </p>
                            <p className="text-xs text-muted">
                              {currency}
                              {line.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          aria-label={`Remove ${item.name}`}
                          className="shrink-0 rounded-lg px-2 py-1 text-muted hover:bg-err-bg hover:text-err"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between bg-stripe px-3 py-2 text-sm font-semibold text-ink">
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
                className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
              >
                {submitting ? "Creating invoice…" : "Create invoice"}
              </button>
            </form>

            {message && (
              <p className={`mt-4 text-sm ${message.type === "ok" ? "text-ok" : "text-err"}`}>{message.text}</p>
            )}
          </section>
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
