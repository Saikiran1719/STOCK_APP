"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductAvatar from "@/components/ProductAvatar";

type PaymentStatus = "unpaid" | "partial" | "paid";
type PurchaseStatus = "active" | "voided";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Vendor = { id: number; name: string; address: string };
type CartItem = { name: string; qty: number; unitCost: number };
type Message = { type: "ok" | "error"; text: string };

type Purchase = {
  id: number;
  vendorName: string;
  vendorRef: string;
  itemsLabel: string;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  createdAt: string;
};

function purchaseNumberFor(id: number) {
  return `PUR-${String(id).padStart(6, "0")}`;
}

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorRef, setVendorRef] = useState("");
  const [partyId, setPartyId] = useState<number | undefined>(undefined);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickProduct, setPickProduct] = useState("");
  const [pickQty, setPickQty] = useState(1);
  const [pickCost, setPickCost] = useState<number | "">("");
  const [message, setMessage] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
      const [purchRes, prodRes, vendorRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/products"),
        fetch("/api/parties?type=vendor"),
      ]);
      if (purchRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const purchData = await purchRes.json();
      if (!purchRes.ok) {
        setLoadError(purchData.error || "Failed to load purchases.");
        return;
      }
      setPurchases(purchData.purchases || []);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
        setCurrency(prodData.currencySymbol || "");
        setPickProduct((prev) =>
          prev && (prodData.products || []).some((p: Product) => p.name === prev)
            ? prev
            : prodData.products?.[0]?.name ?? ""
        );
      }
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        setVendors(vendorData.parties || []);
      }
    } catch {
      setLoadError("Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const product = products.find((p) => p.name === pickProduct);
    if (product) setPickCost(product.cost);
  }, [pickProduct, products]);

  function handleVendorNameChange(value: string) {
    setVendorName(value);
    const match = vendors.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    setPartyId(match?.id);
  }

  function addItem() {
    if (!pickProduct || pickQty < 1 || pickCost === "" || pickCost < 0) return;
    setCart((prev) => [...prev, { name: pickProduct, qty: pickQty, unitCost: Number(pickCost) }]);
    setPickQty(1);
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function lineTotal(item: CartItem) {
    const product = products.find((p) => p.name === item.name);
    const gstRate = product?.gstRate ?? 0;
    const subtotal = item.unitCost * item.qty;
    const gst = (subtotal * gstRate) / 100;
    return subtotal + gst;
  }

  const cartTotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
  const canSubmit = cart.length > 0 && vendorName.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName,
          vendorRef,
          partyId,
          items: cart.map((c) => ({ name: c.name, qty: c.qty, unitCost: c.unitCost })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to record the purchase." });
        return;
      }
      if (data.purchaseId != null) {
        router.push(`/purchases/${data.purchaseId}`);
        return;
      }
      setMessage({ type: "error", text: "Purchase recorded, but no purchase id was returned." });
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((pu) => {
      if (dateFilter && toDateInputValue(pu.createdAt) !== dateFilter) return false;
      if (q) {
        const haystack = `${pu.vendorName} ${pu.vendorRef} ${pu.itemsLabel}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [purchases, dateFilter, search]);

  const filteredTotal = filtered.filter((pu) => pu.status === "active").reduce((sum, pu) => sum + pu.total, 0);

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Buying</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Purchases</h1>
          <p className="mt-1 text-sm text-muted">
            Vendor bills — stock in with a real cost and vendor on record, not just a quantity bump.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          {showForm ? "Cancel" : "+ New purchase"}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(29,45,62,0.05)]"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="vendor-name">
                Vendor name
              </label>
              <input
                id="vendor-name"
                type="text"
                list="vendor-options"
                required
                value={vendorName}
                onChange={(e) => handleVendorNameChange(e.target.value)}
                placeholder="Pick a saved vendor, or type a new one"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <datalist id="vendor-options">
                {vendors.map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
              </datalist>
              {partyId && <p className="mt-1 text-xs text-ok">✓ Existing vendor.</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="vendor-ref">
                Vendor&apos;s bill/invoice no. <span className="text-muted">(optional)</span>
              </label>
              <input
                id="vendor-ref"
                type="text"
                value={vendorRef}
                onChange={(e) => setVendorRef(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted">Add item</p>
            <select
              value={pickProduct}
              onChange={(e) => setPickProduct(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {products.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="pick-qty">
                  Qty
                </label>
                <input
                  id="pick-qty"
                  type="number"
                  min={1}
                  value={pickQty}
                  onChange={(e) => setPickQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="pick-cost">
                  Cost paid / unit
                </label>
                <input
                  id="pick-cost"
                  type="number"
                  min={0}
                  value={pickCost}
                  onChange={(e) => setPickCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={!pickProduct || pickQty < 1 || pickCost === "" || pickCost < 0}
              className="mt-2 w-full whitespace-nowrap rounded-lg border border-accent px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-45"
            >
              Add item
            </button>
          </div>

          {cart.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              {cart.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ProductAvatar name={item.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {item.name} × {item.qty} @ {currency}
                        {item.unitCost}
                      </p>
                      <p className="text-xs text-muted">
                        {currency}
                        {lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
              ))}
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
            className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
          >
            {submitting ? "Recording…" : "Record purchase"}
          </button>
          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-ok" : "text-err"}`}>{message.text}</p>
          )}
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(29,45,62,0.05)] sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="search">
                Search vendor or product
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Acme Supplies, or MOUSE"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-auto"
              />
            </div>
            {(dateFilter || search) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setSearch("");
                }}
                className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-stripe"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">
                {filtered.length} purchase{filtered.length === 1 ? "" : "s"}
              </h2>
              <p className="text-sm text-muted">Total: {money(filteredTotal)}</p>
            </div>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                {purchases.length === 0 ? "No purchases yet." : "No purchases match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <Th>Purchase</Th>
                      <Th>Date</Th>
                      <Th>Vendor</Th>
                      <Th>Items</Th>
                      <Th align="right">Total</Th>
                      <Th>Payment</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pu, i) => {
                      const voided = pu.status === "voided";
                      return (
                        <tr
                          key={pu.id}
                          className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft ${voided ? "opacity-50" : ""}`}
                        >
                          <Td className="font-medium text-ink">
                            <span className={voided ? "line-through" : ""}>{purchaseNumberFor(pu.id)}</span>
                            {voided && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-err-bg px-2 py-0.5 text-xs font-medium text-err">
                                ⊘ Voided
                              </span>
                            )}
                          </Td>
                          <Td className="text-muted">
                            {new Date(pu.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Td>
                          <Td className="text-muted">{pu.vendorName}</Td>
                          <Td className="max-w-xs whitespace-normal text-muted">{pu.itemsLabel}</Td>
                          <Td align="right" className="text-ink">
                            {money(pu.total)}
                          </Td>
                          <Td>{!voided && <PaymentPill status={pu.paymentStatus} />}</Td>
                          <Td>
                            <Link href={`/purchases/${pu.id}`} className="font-medium text-accent hover:underline">
                              View
                            </Link>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`whitespace-nowrap border-b border-r border-border px-5 py-3 last:border-r-0 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-r border-border px-5 py-3 last:border-r-0 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

function PaymentPill({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-medium text-ok">
        ✓ Paid
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-warn">
        ◐ Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-err-bg px-2.5 py-0.5 text-xs font-medium text-err">
      ! Unpaid
    </span>
  );
}
