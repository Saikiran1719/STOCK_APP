"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { PaymentPill } from "@/components/Pill";

type PaymentStatus = "unpaid" | "partial" | "paid";
type InvoiceStatus = "active" | "voided";
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

type InvoiceItem = {
  productName: string;
  qty: number;
  unitCost: number;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  hsnCode: string;
};

type Invoice = {
  id: number;
  invoiceNo: string;
  partyId: number | null;
  customerName: string;
  customerAddress: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  discountPercent: number;
  discountAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  voidReason: string | null;
  createdAt: string;
  items: InvoiceItem[];
};

type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currencySymbol: string;
  invoiceNote: string;
  logoDataUrl: string;
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
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
      const res = await fetch(`/api/invoices/${params.id}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 404 ? "Invoice not found." : data.error || "Failed to load invoice.");
        return;
      }
      setInvoice(data.invoice);
      setSettings(data.settings);
      document.title = `Invoice No: ${data.invoice.invoiceNo}`;

      const payRes = await fetch(`/api/payments?invoiceId=${params.id}`);
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
      const res = await fetch(`/api/invoices/${params.id}`, {
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
      const res = await fetch(`/api/invoices/${params.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReasonInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoidMessage(data.error || "Failed to void the invoice.");
        return;
      }
      setShowVoidForm(false);
      await load();
    } finally {
      setVoidSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (error || !invoice || !settings) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/invoices" className="text-sm text-muted hover:text-ink">
          ← Back to invoices
        </Link>
        <p className="mt-4 text-sm text-err">{error || "Invoice not found."}</p>
      </main>
    );
  }

  const invoiceNumber = invoice.invoiceNo;
  const date = new Date(invoice.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const currency = settings.currencySymbol;

  // Standard Indian intra-state GST invoice: each item's GST rate is split
  // evenly into CGST + SGST. If this business ever bills across states,
  // that half of the invoice should become IGST instead — not handled here.
  const totalCgst = invoice.gstAmount / 2;
  const totalSgst = invoice.gstAmount / 2;

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/invoices" className="text-sm text-muted hover:text-ink">
          ← Back to invoices
        </Link>
        <PrintButton />
      </div>

      {invoice.status === "voided" && (
        <div className="mb-4 rounded-2xl border-2 border-err bg-err-bg px-4 py-3 text-err">
          <p className="text-lg font-bold uppercase tracking-widest">⚠ Voided</p>
          {invoice.voidReason && <p className="text-sm">Reason: {invoice.voidReason}</p>}
        </div>
      )}

      <div className="border-2 border-ink bg-white text-ink print:border-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b-2 border-ink p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex items-start gap-3">
            {settings.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoDataUrl}
                alt={`${settings.companyName || "Company"} logo`}
                className="h-12 w-12 shrink-0 rounded-lg object-contain"
              />
            )}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">
                {settings.companyName || "Your Company Name"}
              </h1>
              {settings.address && (
                <p className="whitespace-pre-line text-sm text-ink/80">{settings.address}</p>
              )}
              {(settings.phone || settings.email) && (
                <p className="text-sm text-ink/80">
                  {[settings.phone && `Ph: ${settings.phone}`, settings.email].filter(Boolean).join("  |  ")}
                </p>
              )}
              {settings.gstin && <p className="text-sm font-medium text-ink/80">GSTIN: {settings.gstin}</p>}
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-2xl font-bold uppercase tracking-widest">Tax Invoice</p>
            <p className="mt-1 text-sm text-ink/80">
              Invoice No: <span className="font-medium">{invoiceNumber}</span>
            </p>
            <p className="text-sm text-ink/80">
              Date: <span className="font-medium">{date}</span>
            </p>
            {invoice.status === "active" && (
              <p className="mt-1">
                <PaymentPill status={invoice.paymentStatus} />
              </p>
            )}
          </div>
        </div>

        {!settings.companyName && (
          <p className="border-b border-warn/30 bg-warn-bg px-4 py-2 text-xs text-warn sm:px-6 print:hidden">
            No company details set yet — fill them in on the Settings page so they show up here.
          </p>
        )}

        {/* Bill to */}
        <div className="border-b-2 border-ink p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
          <p className="text-sm font-medium">{invoice.customerName || "Cash / Walk-in customer"}</p>
          {invoice.customerAddress && (
            <p className="whitespace-pre-line text-sm text-ink/70">{invoice.customerAddress}</p>
          )}
          {invoice.partyId && (
            <Link
              href={`/parties/${invoice.partyId}`}
              className="mt-1 inline-block text-xs text-accent hover:underline print:hidden"
            >
              View party & ledger →
            </Link>
          )}
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-head">
                <Th className="text-left">#</Th>
                <Th className="text-left">Description</Th>
                <Th className="text-left">HSN/SAC</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Rate</Th>
                <Th className="text-right">Taxable Value</Th>
                <Th className="text-right">CGST</Th>
                <Th className="text-right">SGST</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => {
                const halfRate = item.gstRate / 2;
                const halfGst = item.gstAmount / 2;
                return (
                  <tr key={i}>
                    <Td className="text-left">{i + 1}</Td>
                    <Td className="text-left font-medium">{item.productName}</Td>
                    <Td className="text-left text-ink/70">{item.hsnCode || "—"}</Td>
                    <Td className="text-right">{item.qty}</Td>
                    <Td className="text-right">{money(item.unitCost)}</Td>
                    <Td className="text-right">{money(item.subtotal)}</Td>
                    <Td className="text-right">
                      {halfRate}%<br />
                      {money(halfGst)}
                    </Td>
                    <Td className="text-right">
                      {halfRate}%<br />
                      {money(halfGst)}
                    </Td>
                    <Td className="text-right font-medium">{money(item.total)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t-2 border-ink p-4 sm:p-6">
          <table className="w-full max-w-xs text-sm">
            <tbody>
              {invoice.discountAmount > 0 && (
                <>
                  <TotalRow label="Gross Amount" value={money(invoice.subtotal + invoice.discountAmount)} />
                  <TotalRow
                    label={`Discount (${invoice.discountPercent}%)`}
                    value={`− ${money(invoice.discountAmount)}`}
                  />
                </>
              )}
              <TotalRow label="Taxable Amount" value={money(invoice.subtotal)} />
              <TotalRow label="CGST" value={money(totalCgst)} />
              <TotalRow label="SGST" value={money(totalSgst)} />
              <tr className="border-t-2 border-ink">
                <td className="py-2 text-sm font-bold uppercase">Grand Total</td>
                <td className="py-2 text-right text-base font-bold">{money(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-6 border-t-2 border-ink p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <p className="max-w-xs text-xs text-muted">{settings.invoiceNote}</p>
          <div className="text-left text-xs text-ink/80 sm:text-center">
            <p className="mb-8">For {settings.companyName || "Your Company Name"}</p>
            <p className="border-t border-ink/40 pt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {invoice.status === "active" && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 print:hidden">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-ink">💳 Record payment</h2>
            <p className="-mt-2 mb-4 text-xs text-muted">
              Balance due {money(Math.max(0, invoice.total - invoice.amountPaid))}
            </p>
            <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pay-amount">
                    Amount received
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    min={0}
                    max={invoice.total - invoice.amountPaid}
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
            <h2 className="mb-1 text-sm font-semibold text-ink">🚫 Void this invoice</h2>
            <p className="mb-4 text-xs text-muted">
              Restores stock for every item on this invoice. Cannot be undone.
            </p>
            {!showVoidForm ? (
              <button
                type="button"
                onClick={() => setShowVoidForm(true)}
                className="rounded-lg border border-err px-4 py-2 text-sm font-medium text-err transition hover:bg-err-bg"
              >
                Void invoice…
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
                    placeholder="e.g. customer canceled, entered by mistake"
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

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-ink px-2 py-2 text-xs font-semibold uppercase tracking-wide sm:px-3 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-ink px-2 py-2 align-top sm:px-3 ${className}`}>{children}</td>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-muted">{label}</td>
      <td className="py-1 text-right">{value}</td>
    </tr>
  );
}
