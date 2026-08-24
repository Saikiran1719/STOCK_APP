"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type Party = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
};

type Message = { type: "ok" | "error"; text: string };

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function loadParties() {
    setLoading(true);
    setLoadError("");
    try {
      const [partyRes, prodRes] = await Promise.all([fetch("/api/parties"), fetch("/api/products")]);
      if (partyRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await partyRes.json();
      if (!partyRes.ok) {
        setLoadError(data.error || "Failed to load parties.");
        return;
      }
      setParties(data.parties || []);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setCurrency(prodData.currencySymbol || "");
      }
    } catch {
      setLoadError("Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParties();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.gstin.toLowerCase().includes(q)
    );
  }, [parties, search]);

  const totalOutstanding = filtered.reduce((sum, p) => sum + p.outstanding, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email, gstin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to add the party." });
        return;
      }
      setMessage({ type: "ok", text: `"${data.party.name}" added.` });
      setName("");
      setAddress("");
      setPhone("");
      setEmail("");
      setGstin("");
      await loadParties();
    } finally {
      setSubmitting(false);
    }
  }

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Customers</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Parties</h1>
          <p className="mt-1 text-sm text-muted">
            Every customer you&apos;ve billed, saved once and reused — pick them on a sale instead of
            retyping their details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          {showForm ? "Cancel" : "+ Add party"}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[0_2px_10px_rgba(29,45,62,0.05)]"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="party-name">
              Name
            </label>
            <input
              id="party-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="party-address">
              Address
            </label>
            <textarea
              id="party-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="party-phone">
                Phone
              </label>
              <input
                id="party-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="party-email">
                Email
              </label>
              <input
                id="party-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="party-gstin">
              GSTIN <span className="text-muted">(optional)</span>
            </label>
            <input
              id="party-gstin"
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
          >
            {submitting ? "Adding…" : "Save party"}
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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or GSTIN…"
              className="w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <p className="text-sm text-muted">
              {filtered.length} part{filtered.length === 1 ? "y" : "ies"} · Outstanding: {money(totalOutstanding)}
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              {parties.length === 0
                ? "No parties yet — add one, or they'll be saved automatically the next time you bill a new customer."
                : "No parties match that search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>GSTIN</Th>
                    <Th align="right">Invoices</Th>
                    <Th align="right">Billed</Th>
                    <Th align="right">Outstanding</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                      <Td className="font-medium text-ink">
                        <Link href={`/parties/${p.id}`} className="text-accent hover:underline">
                          {p.name}
                        </Link>
                      </Td>
                      <Td className="text-muted">{p.phone || "—"}</Td>
                      <Td className="text-muted">{p.gstin || "—"}</Td>
                      <Td align="right" className="text-muted">
                        {p.invoiceCount}
                      </Td>
                      <Td align="right" className="text-ink">
                        {money(p.totalBilled)}
                      </Td>
                      <Td align="right" className={p.outstanding > 0 ? "text-warn font-medium" : "text-muted"}>
                        {money(p.outstanding)}
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
