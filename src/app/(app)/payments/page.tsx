"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Th, Td, TABLE_HEAD_ROW } from "@/components/DataTable";
import { DirectionPill } from "@/components/Pill";
import StatTile from "@/components/StatTile";

type Direction = "in" | "out";
type PayMode = "cash" | "bank" | "upi" | "cheque" | "other";

const PAY_MODE_LABELS: Record<PayMode, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};

type Payment = {
  id: number;
  direction: Direction;
  partyId: number | null;
  partyName: string;
  invoiceId: number | null;
  purchaseId: number | null;
  amount: number;
  mode: PayMode;
  reference: string;
  createdAt: string;
};

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<PayMode | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<Direction | "all">("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const [payRes, prodRes] = await Promise.all([fetch("/api/payments"), fetch("/api/products")]);
        if (payRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await payRes.json();
        if (!payRes.ok) {
          setLoadError(data.error || "Failed to load payments.");
          return;
        }
        setPayments(data.payments || []);
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
    load();
  }, []);

  // The API returns newest-first; a running balance reads chronologically
  // (like a bank statement), so walk it oldest-to-newest once here and
  // stamp each row with its balance as of that moment — filtering below
  // never recomputes it, so the numbers stay true to history even when a
  // filter hides some of the rows around them.
  const withBalance = useMemo(() => {
    const chronological = payments.slice().reverse();
    let balance = 0;
    const balanceById = new Map<number, number>();
    for (const p of chronological) {
      balance += p.direction === "in" ? p.amount : -p.amount;
      balanceById.set(p.id, balance);
    }
    return payments.map((p) => ({ ...p, balance: balanceById.get(p.id) ?? 0 }));
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withBalance.filter((p) => {
      if (modeFilter !== "all" && p.mode !== modeFilter) return false;
      if (directionFilter !== "all" && p.direction !== directionFilter) return false;
      if (dateFilter && toDateInputValue(p.createdAt) !== dateFilter) return false;
      if (q) {
        const haystack = `${p.partyName} ${p.reference}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [withBalance, search, modeFilter, directionFilter, dateFilter]);

  const totalIn = payments.filter((p) => p.direction === "in").reduce((sum, p) => sum + p.amount, 0);
  const totalOut = payments.filter((p) => p.direction === "out").reduce((sum, p) => sum + p.amount, 0);
  const netBalance = totalIn - totalOut;
  const hasFilters = Boolean(search || modeFilter !== "all" || directionFilter !== "all" || dateFilter);

  const money = (n: number) =>
    `${currency}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Money</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Cash &amp; Bank</h1>
        <p className="mt-1 text-sm text-muted">
          Every payment collected from a customer or paid to a vendor — recorded from an invoice or
          purchase&apos;s own &ldquo;Record payment&rdquo; section, gathered here into one ledger.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total in" value={money(totalIn)} tone="ok" />
        <StatTile label="Total out" value={money(totalOut)} tone="err" />
        <StatTile
          label="Net balance"
          value={`${netBalance < 0 ? "− " : ""}${money(netBalance)}`}
          tone={netBalance >= 0 ? "default" : "warn"}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="search">
                Search party or reference
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Acme Supplies, or UTR12345"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="direction">
                Type
              </label>
              <select
                id="direction"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as Direction | "all")}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-auto"
              >
                <option value="all">All</option>
                <option value="in">In</option>
                <option value="out">Out</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="mode">
                Mode
              </label>
              <select
                id="mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as PayMode | "all")}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-auto"
              >
                <option value="all">All</option>
                {(Object.keys(PAY_MODE_LABELS) as PayMode[]).map((m) => (
                  <option key={m} value={m}>
                    {PAY_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
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
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setModeFilter("all");
                  setDirectionFilter("all");
                  setDateFilter("");
                }}
                className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-stripe"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">
                {filtered.length} payment{filtered.length === 1 ? "" : "s"}
              </h2>
            </div>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                {payments.length === 0
                  ? "No payments recorded yet — record one from an invoice or purchase."
                  : "No payments match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Party</Th>
                      <Th>Against</Th>
                      <Th>Mode</Th>
                      <Th>Reference</Th>
                      <Th align="right">Amount</Th>
                      <Th align="right">Balance</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id} className={i % 2 === 1 ? "bg-stripe" : ""}>
                        <Td className="text-muted">
                          {new Date(p.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Td>
                        <Td>
                          <DirectionPill direction={p.direction} />
                        </Td>
                        <Td className="text-ink">
                          {p.partyId ? (
                            <Link href={`/parties/${p.partyId}`} className="font-medium text-accent hover:underline">
                              {p.partyName || "—"}
                            </Link>
                          ) : (
                            p.partyName || "—"
                          )}
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
                        <Td align="right" className={`font-medium ${p.direction === "in" ? "text-ok" : "text-err"}`}>
                          {p.direction === "in" ? "+ " : "− "}
                          {money(p.amount)}
                        </Td>
                        <Td align="right" className="text-ink tabular-nums">
                          {p.balance < 0 ? "− " : ""}
                          {money(p.balance)}
                        </Td>
                      </tr>
                    ))}
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
