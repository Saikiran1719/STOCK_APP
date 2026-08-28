"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Th, Td, TABLE_HEAD_ROW } from "@/components/DataTable";
import { PaymentPill, VoidedPill } from "@/components/Pill";
import StatTile from "@/components/StatTile";

type PaymentStatus = "unpaid" | "partial" | "paid";
type TxStatus = "active" | "voided";
type PartyType = "customer" | "vendor";

type Party = {
  id: number;
  type: PartyType;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
};

type Invoice = {
  id: number;
  invoiceNo: string;
  itemsLabel: string;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: TxStatus;
  createdAt: string;
};

type Purchase = {
  id: number;
  vendorRef: string;
  itemsLabel: string;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: TxStatus;
  createdAt: string;
};

type PayMode = "cash" | "bank" | "upi" | "cheque" | "other";

const PAY_MODE_LABELS: Record<PayMode, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};

type PaymentEntry = {
  id: number;
  direction: "in" | "out";
  invoiceId: number | null;
  purchaseId: number | null;
  amount: number;
  mode: PayMode;
  reference: string;
  createdAt: string;
};

type Message = { type: "ok" | "error"; text: string };

function purchaseNumberFor(id: number) {
  return `PUR-${String(id).padStart(6, "0")}`;
}

export default function PartyDetailPage() {
  const params = useParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ledgerRes, prodRes] = await Promise.all([
        fetch(`/api/parties/${params.id}`),
        fetch("/api/products"),
      ]);
      if (ledgerRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await ledgerRes.json();
      if (!ledgerRes.ok) {
        setError(ledgerRes.status === 404 ? "Party not found." : data.error || "Failed to load the party.");
        return;
      }
      setParty(data.party);
      setInvoices(data.invoices || []);
      setPurchases(data.purchases || []);
      setPayments(data.payments || []);
      setName(data.party.name);
      setAddress(data.party.address);
      setPhone(data.party.phone);
      setEmail(data.party.email);
      setGstin(data.party.gstin);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setCurrency(prodData.currencySymbol || "");
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/parties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email, gstin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save changes." });
        return;
      }
      setMessage({ type: "ok", text: "Saved." });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/parties" className="text-sm text-muted hover:text-ink">
          ← Back to parties
        </Link>
        <p className="mt-4 text-sm text-err">{error || "Party not found."}</p>
      </main>
    );
  }

  const isVendor = party.type === "vendor";
  const activeTxs = isVendor
    ? purchases.filter((pu) => pu.status === "active")
    : invoices.filter((inv) => inv.status === "active");
  const totalBilled = activeTxs.reduce((sum, tx) => sum + tx.total, 0);
  const totalPaid = activeTxs.reduce((sum, tx) => sum + tx.amountPaid, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <Link href="/parties" className="text-sm text-muted hover:text-ink">
        ← Back to parties
      </Link>

      <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {isVendor ? "Vendor" : "Party"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{party.name}</h1>
          {party.address && <p className="mt-1 whitespace-pre-line text-sm text-muted">{party.address}</p>}
          <p className="mt-1 text-sm text-muted">
            {[party.phone, party.email, party.gstin && `GSTIN: ${party.gstin}`].filter(Boolean).join("  ·  ") ||
              "No phone, email, or GSTIN on file."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
        >
          {editing ? "Cancel" : "Edit party"}
        </button>
      </header>

      {editing && (
        <form
          onSubmit={handleSave}
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-party-name">
              Name
            </label>
            <input
              id="edit-party-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-party-address">
              Address
            </label>
            <textarea
              id="edit-party-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-party-phone">
                Phone
              </label>
              <input
                id="edit-party-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-party-email">
                Email
              </label>
              <input
                id="edit-party-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-party-gstin">
              GSTIN
            </label>
            <input
              id="edit-party-gstin"
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-ok" : "text-err"}`}>{message.text}</p>
          )}
        </form>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={isVendor ? "Total purchased" : "Total billed"} value={money(totalBilled)} />
        <StatTile label="Total paid" value={money(totalPaid)} tone="ok" />
        <StatTile
          label={isVendor ? "Payable" : "Outstanding"}
          value={money(outstanding)}
          tone={outstanding > 0 ? "warn" : "default"}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">
            {isVendor ? "📥 Purchase history" : "🧾 Invoice history"}
          </h2>
          <p className="text-xs text-muted">
            {isVendor ? "Every purchase ever recorded against this vendor." : "Every invoice ever billed to this party."}
          </p>
        </div>
        {isVendor ? (
          purchases.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No purchases yet from this vendor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <Th>Purchase</Th>
                    <Th>Date</Th>
                    <Th>Items</Th>
                    <Th align="right">Total</Th>
                    <Th>Payment</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((pu, i) => {
                    const voided = pu.status === "voided";
                    return (
                      <tr
                        key={pu.id}
                        className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft ${voided ? "opacity-50" : ""}`}
                      >
                        <Td className="font-medium text-ink">
                          <span className={voided ? "line-through" : ""}>{purchaseNumberFor(pu.id)}</span>
                          {voided && <VoidedPill />}
                        </Td>
                        <Td className="text-muted">
                          {new Date(pu.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Td>
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
          )
        ) : invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No invoices yet for this party.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Items</Th>
                  <Th align="right">Total</Th>
                  <Th>Payment</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const voided = inv.status === "voided";
                  return (
                    <tr
                      key={inv.id}
                      className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft ${voided ? "opacity-50" : ""}`}
                    >
                      <Td className="font-medium text-ink">
                        <span className={voided ? "line-through" : ""}>{inv.invoiceNo}</span>
                        {voided && <VoidedPill />}
                      </Td>
                      <Td className="text-muted">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </Td>
                      <Td className="max-w-xs whitespace-normal text-muted">{inv.itemsLabel}</Td>
                      <Td align="right" className="text-ink">
                        {money(inv.total)}
                      </Td>
                      <Td>{!voided && <PaymentPill status={inv.paymentStatus} />}</Td>
                      <Td>
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-accent hover:underline">
                          View / Print
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

      {payments.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">💳 Payment history</h2>
            <p className="text-xs text-muted">
              {isVendor ? "Every payment made to this vendor." : "Every payment collected from this party."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <Th>Date</Th>
                  <Th>Against</Th>
                  <Th>Mode</Th>
                  <Th>Reference</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 1 ? "bg-stripe" : ""}>
                    <Td className="text-muted">
                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Td>
                    <Td>
                      {p.direction === "in" ? (
                        <Link href={`/invoices/${p.invoiceId}`} className="text-accent hover:underline">
                          Invoice #{p.invoiceId}
                        </Link>
                      ) : (
                        <Link href={`/purchases/${p.purchaseId}`} className="text-accent hover:underline">
                          Purchase #{p.purchaseId}
                        </Link>
                      )}
                    </Td>
                    <Td className="text-muted">{PAY_MODE_LABELS[p.mode]}</Td>
                    <Td className="text-muted">{p.reference || "—"}</Td>
                    <Td align="right" className="font-medium text-ink">
                      {money(p.amount)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
