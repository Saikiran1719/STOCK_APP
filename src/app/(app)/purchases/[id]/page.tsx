"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Th, Td, TABLE_HEAD_ROW } from "@/components/DataTable";
import { PaymentPill } from "@/components/Pill";

type PaymentStatus = "unpaid" | "partial" | "paid";
type PurchaseStatus = "active" | "voided";
type PayMode = "cash" | "bank" | "upi" | "cheque" | "other";

const PAY_MODE_OPTIONS: { value: PayMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function payModeLabel(mode: PayMode) {
  return PAY_MODE_OPTIONS.find((m) => m.value === mode)?.label ?? mode;
}

type PaymentEntry = {
  id: number;
  amount: number;
  mode: PayMode;
  reference: string;
  createdAt: string;
};

type PurchaseItem = {
  productName: string;
  qty: number;
  unitCost: number;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  hsnCode: string;
};

type Purchase = {
  id: number;
  partyId: number | null;
  vendorName: string;
  vendorRef: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  voidReason: string | null;
  createdAt: string;
  items: PurchaseItem[];
};

function purchaseNumberFor(id: number) {
  return `PUR-${String(id).padStart(6, "0")}`;
}

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [payReference, setPayReference] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payMessage, setPayMessage] = useState("");

  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReasonInput, setVoidReasonInput] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidMessage, setVoidMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [purchRes, prodRes] = await Promise.all([
        fetch(`/api/purchases/${params.id}`),
        fetch("/api/products"),
      ]);
      if (purchRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await purchRes.json();
      if (!purchRes.ok) {
        setError(purchRes.status === 404 ? "Purchase not found." : data.error || "Failed to load the purchase.");
        return;
      }
      setPurchase(data.purchase);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setCurrency(prodData.currencySymbol || "");
      }

      const payRes = await fetch(`/api/payments?purchaseId=${params.id}`);
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments ?? []);
      }
    } catch {
      setError("Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (payAmount === "" || payAmount <= 0) return;
    setPayMessage("");
    setPaySubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount, mode: payMode, reference: payReference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayMessage(data.error || "Failed to record the payment.");
        return;
      }
      setPayMessage("Payment recorded.");
      setPayAmount("");
      setPayReference("");
      await load();
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleVoid(e: FormEvent) {
    e.preventDefault();
    if (!voidReasonInput.trim()) return;
    setVoidMessage("");
    setVoidSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${params.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReasonInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoidMessage(data.error || "Failed to void the purchase.");
        return;
      }
      setShowVoidForm(false);
      await load();
    } finally {
      setVoidSubmitting(false);
    }
  }

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (error || !purchase) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/purchases" className="text-sm text-muted hover:text-ink">
          ← Back to purchases
        </Link>
        <p className="mt-4 text-sm text-err">{error || "Purchase not found."}</p>
      </main>
    );
  }

  const totalCgst = purchase.gstAmount / 2;
  const totalSgst = purchase.gstAmount / 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <Link href="/purchases" className="text-sm text-muted hover:text-ink">
        ← Back to purchases
      </Link>

      {purchase.status === "voided" && (
        <div className="mb-4 mt-3 rounded-2xl border-2 border-err bg-err-bg px-4 py-3 text-err">
          <p className="text-lg font-bold uppercase tracking-widest">⚠ Voided</p>
          {purchase.voidReason && <p className="text-sm">Reason: {purchase.voidReason}</p>}
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Purchase</p>
            <h1 className="text-xl font-bold tracking-tight text-ink">{purchaseNumberFor(purchase.id)}</h1>
            <p className="mt-1 text-sm text-muted">
              {new Date(purchase.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-medium text-ink">
              {purchase.partyId ? (
                <Link href={`/parties/${purchase.partyId}`} className="text-accent hover:underline">
                  {purchase.vendorName}
                </Link>
              ) : (
                purchase.vendorName
              )}
            </p>
            {purchase.vendorRef && <p className="text-sm text-muted">Bill ref: {purchase.vendorRef}</p>}
            {purchase.status === "active" && (
              <p className="mt-1">
                <PaymentPill status={purchase.paymentStatus} />
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <Th>Product</Th>
                <Th>HSN/SAC</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Cost / unit</Th>
                <Th align="right">GST</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-stripe" : ""}>
                  <Td className="font-medium text-ink">{item.productName}</Td>
                  <Td className="text-muted">{item.hsnCode || "—"}</Td>
                  <Td align="right" className="text-muted">
                    {item.qty}
                  </Td>
                  <Td align="right" className="text-muted">
                    {money(item.unitCost)}
                  </Td>
                  <Td align="right" className="text-muted">
                    {item.gstRate}%
                  </Td>
                  <Td align="right" className="text-ink">
                    {money(item.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-border p-5">
          <table className="w-full max-w-xs text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-muted">Taxable amount</td>
                <td className="py-1 text-right text-ink">{money(purchase.subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">CGST</td>
                <td className="py-1 text-right text-ink">{money(totalCgst)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">SGST</td>
                <td className="py-1 text-right text-ink">{money(totalSgst)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 text-sm font-bold uppercase text-ink">Grand total</td>
                <td className="py-2 text-right text-base font-bold text-ink">{money(purchase.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {purchase.status === "active" && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-ink">💳 Record payment</h2>
            <p className="-mt-2 mb-4 text-xs text-muted">
              Balance due {money(Math.max(0, purchase.total - purchase.amountPaid))}
            </p>
            <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pay-amount">
                    Amount paid
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    min={0}
                    max={purchase.total - purchase.amountPaid}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pay-mode">
                    Mode
                  </label>
                  <select
                    id="pay-mode"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PayMode)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    {PAY_MODE_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pay-reference">
                  Reference <span className="text-muted">(optional — cheque no., UTR, etc.)</span>
                </label>
                <input
                  id="pay-reference"
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <button
                type="submit"
                disabled={paySubmitting || payAmount === "" || payAmount <= 0}
                className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
              >
                {paySubmitting ? "Saving…" : "Save payment"}
              </button>
              {payMessage && <p className="text-sm text-muted">{payMessage}</p>}
            </form>

            {payments.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Payment history</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-ink">
                      <span className="text-muted">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                        {payModeLabel(p.mode)}
                        {p.reference && ` · ${p.reference}`}
                      </span>
                      <span className="font-medium">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-1 text-sm font-semibold text-ink">🚫 Void this purchase</h2>
            <p className="mb-4 text-xs text-muted">
              Reverses stock for every item on this purchase. Cannot be undone.
            </p>
            {!showVoidForm ? (
              <button
                type="button"
                onClick={() => setShowVoidForm(true)}
                className="rounded-lg border border-err px-4 py-2 text-sm font-medium text-err transition hover:bg-err-bg"
              >
                Void purchase…
              </button>
            ) : (
              <form onSubmit={handleVoid} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="void-reason">
                    Reason <span className="text-muted">(required)</span>
                  </label>
                  <input
                    id="void-reason"
                    type="text"
                    value={voidReasonInput}
                    onChange={(e) => setVoidReasonInput(e.target.value)}
                    placeholder="e.g. entered by mistake, wrong vendor"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-err focus:ring-2 focus:ring-err/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={voidSubmitting || !voidReasonInput.trim()}
                    className="rounded-lg bg-err px-4 py-2 text-sm font-medium text-white transition hover:bg-err/85 disabled:opacity-50"
                  >
                    {voidSubmitting ? "Voiding…" : "Confirm void"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoidForm(false)}
                    className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-stripe"
                  >
                    Cancel
                  </button>
                </div>
                {voidMessage && <p className="text-sm text-err">{voidMessage}</p>}
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
