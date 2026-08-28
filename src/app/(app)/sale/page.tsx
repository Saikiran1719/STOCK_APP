"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Party = { id: number; name: string; address: string };
type Row = { id: number; productName: string; qty: number };
type Message = { type: "ok" | "error"; text: string };

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [partyId, setPartyId] = useState<number | undefined>(undefined);
  const [discountPercent, setDiscountPercent] = useState<number | "">(0);

  const [rows, setRows] = useState<Row[]>([]);
  const nextRowId = useRef(1);

  const [message, setMessage] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        const list: Product[] = data.products || [];
        setProducts(list);
        setCurrency(data.currencySymbol || "");
        if (list.length > 0) {
          setRows([{ id: nextRowId.current++, productName: list[0].name, qty: 1 }]);
        }
      } catch {
        setLoadError("Failed to reach the server.");
      } finally {
        setLoading(false);
      }
    })();

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

  function remainingStock(productName: string, excludingRowId: number) {
    const product = products.find((p) => p.name === productName);
    if (!product) return 0;
    const reserved = rows
      .filter((r) => r.id !== excludingRowId && r.productName === productName)
      .reduce((sum, r) => sum + r.qty, 0);
    return product.stock - reserved;
  }

  function addRow() {
    if (products.length === 0) return;
    setRows((prev) => [...prev, { id: nextRowId.current++, productName: products[0].name, qty: 1 }]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const cleanDiscount = Math.max(0, Math.min(100, Number(discountPercent) || 0));

  function lineCalc(row: Row) {
    const product = products.find((p) => p.name === row.productName);
    if (!product) return { product: null, unitCost: 0, gstRate: 0, gross: 0, taxable: 0, gst: 0, total: 0 };
    const gross = product.cost * row.qty;
    const taxable = gross * (1 - cleanDiscount / 100);
    const gst = (taxable * product.gstRate) / 100;
    return { product, unitCost: product.cost, gstRate: product.gstRate, gross, taxable, gst, total: taxable + gst };
  }

  const validRows = rows.filter((r) => r.productName && r.qty > 0);
  const grossSubtotal = validRows.reduce((sum, r) => sum + lineCalc(r).gross, 0);
  const taxableSubtotal = validRows.reduce((sum, r) => sum + lineCalc(r).taxable, 0);
  const gstTotal = validRows.reduce((sum, r) => sum + lineCalc(r).gst, 0);
  const grandTotal = taxableSubtotal + gstTotal;
  const discountAmount = grossSubtotal - taxableSubtotal;

  const hasStockError = validRows.some((r) => r.qty > remainingStock(r.productName, r.id));
  const canSubmit =
    validRows.length > 0 &&
    customerName.trim().length > 0 &&
    customerAddress.trim().length > 0 &&
    !hasStockError;

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          discountPercent: cleanDiscount,
          items: validRows.map((r) => ({ name: r.productName, qty: r.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Sale failed." });
        return;
      }
      if (data.invoiceId != null) {
        router.push(`/invoices/${data.invoiceId}`);
        return;
      }
      setMessage({ type: "error", text: "Sale recorded, but no invoice was returned." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Billing</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">New Sale</h1>
        <p className="mt-1 text-sm text-muted">Build the bill, then create the invoice.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <section className="overflow-hidden rounded-2xl border border-ink bg-white">
            {/* Header: Bill To (top-left) + discount, laid out like the printed invoice's own header block */}
            <div className="border-b-2 border-ink p-4 sm:p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
              <input
                id="customer"
                type="text"
                list="party-options"
                required
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder="Customer name — pick a saved party, or type a new one"
                className="w-full max-w-md rounded-lg border border-line px-3 py-2 text-sm font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <datalist id="party-options">
                {parties.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
              {partyId && <p className="mt-1 text-xs text-ok">✓ Existing party — address filled in below.</p>}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="customer-address">
                    Address
                  </label>
                  <textarea
                    id="customer-address"
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={2}
                    placeholder="Billing address, shown on the invoice"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="discount">
                    Discount %
                  </label>
                  <input
                    id="discount"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-28"
                  />
                </div>
              </div>
            </div>

            {/* Line items — an editable version of the invoice's own item table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-head">
                    <Th className="text-left">#</Th>
                    <Th className="text-left">Item</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">GST</Th>
                    <Th className="text-right">Taxable Value</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const calc = lineCalc(row);
                    const available = remainingStock(row.productName, row.id);
                    const overStock = row.qty > available;
                    return (
                      <tr key={row.id}>
                        <Td className="text-left text-muted">{i + 1}</Td>
                        <Td className="text-left">
                          <select
                            value={row.productName}
                            onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                            className="w-full min-w-[140px] rounded-lg border border-line px-2 py-1.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                          >
                            {products.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </Td>
                        <Td className="text-right">
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })}
                            className={`w-20 rounded-lg border px-2 py-1.5 text-right text-sm outline-none transition focus:ring-2 ${
                              overStock
                                ? "border-err focus:border-err focus:ring-err/20"
                                : "border-line focus:border-accent focus:ring-accent/20"
                            }`}
                          />
                          {overStock && <p className="mt-0.5 text-xs text-err">only {available} left</p>}
                        </Td>
                        <Td className="text-right text-muted">{money(calc.unitCost)}</Td>
                        <Td className="text-right text-muted">{calc.gstRate}%</Td>
                        <Td className="text-right text-ink">{money(calc.taxable)}</Td>
                        <Td className="text-right font-medium text-ink">{money(calc.total)}</Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            aria-label="Remove row"
                            className="rounded-lg px-1.5 py-1 text-muted hover:bg-err-bg hover:text-err"
                          >
                            ✕
                          </button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={addRow}
                disabled={products.length === 0}
                className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-45"
              >
                + Add row
              </button>
            </div>

            {/* Totals — same shape as the printed invoice's own totals block */}
            <div className="flex justify-end border-t-2 border-ink p-4 sm:p-6">
              <table className="w-full max-w-xs text-sm">
                <tbody>
                  {discountAmount > 0 && (
                    <>
                      <TotalRow label="Gross amount" value={money(grossSubtotal)} />
                      <TotalRow label={`Discount (${cleanDiscount}%)`} value={`− ${money(discountAmount)}`} />
                    </>
                  )}
                  <TotalRow label="Taxable amount" value={money(taxableSubtotal)} />
                  <TotalRow label="CGST" value={money(gstTotal / 2)} />
                  <TotalRow label="SGST" value={money(gstTotal / 2)} />
                  <tr className="border-t-2 border-ink">
                    <td className="py-2 text-sm font-bold uppercase text-ink">Grand total</td>
                    <td className="py-2 text-right text-base font-bold text-ink">{money(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
            >
              {submitting ? "Creating invoice…" : "Create invoice"}
            </button>
            {message && (
              <p className={`mt-3 text-sm ${message.type === "ok" ? "text-ok" : "text-err"}`}>{message.text}</p>
            )}
          </div>
        </form>
      )}
    </main>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap border border-ink px-2 py-2 text-xs font-semibold uppercase tracking-wide sm:px-3 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border border-ink px-2 py-2 align-top sm:px-3 ${className}`}>{children}</td>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-muted">{label}</td>
      <td className="py-1 text-right text-ink">{value}</td>
    </tr>
  );
}
