"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type PaymentStatus = "unpaid" | "partial" | "paid";
type InvoiceStatus = "active" | "voided";

type Party = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
};

type Invoice = {
  id: number;
  itemsLabel: string;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  createdAt: string;
};

type Message = { type: "ok" | "error"; text: string };

function invoiceNumberFor(id: number) {
  return `INV-${String(id).padStart(6, "0")}`;
}

export default function PartyDetailPage() {
  const params = useParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

  const activeInvoices = invoices.filter((inv) => inv.status === "active");
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = activeInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <Link href="/parties" className="text-sm text-muted hover:text-ink">
        ← Back to parties
      </Link>

      <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Party</p>
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
          className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(29,45,62,0.05)]"
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
        <Tile label="Total billed" value={money(totalBilled)} />
        <Tile label="Total paid" value={money(totalPaid)} tone="ok" />
        <Tile label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? "warn" : "default"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">🧾 Invoice history</h2>
          <p className="text-xs text-muted">Every invoice ever billed to this party.</p>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No invoices yet for this party.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
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
                        <span className={voided ? "line-through" : ""}>{invoiceNumberFor(inv.id)}</span>
                        {voided && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-err-bg px-2 py-0.5 text-xs font-medium text-err">
                            ⊘ Voided
                          </span>
                        )}
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
    </main>
  );
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
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
