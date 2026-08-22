"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PaymentStatus = "unpaid" | "partial" | "paid";
type InvoiceStatus = "active" | "voided";

type Invoice = {
  id: number;
  customerName: string;
  customerAddress: string;
  itemsLabel: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  createdAt: string;
};

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function invoiceNumberFor(id: number) {
  return `INV-${String(id).padStart(6, "0")}`;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // "" = all dates
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [invRes, prodRes] = await Promise.all([
          fetch("/api/invoices"),
          fetch("/api/products"),
        ]);
        if (invRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const invData = await invRes.json();
        if (!invRes.ok) {
          setLoadError(invData.error || "Failed to load invoices.");
          return;
        }
        setInvoices(invData.invoices || []);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setCurrency(prodData.currencySymbol || "");
        }
      } catch {
        setLoadError("Failed to reach the server.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (dateFilter && toDateInputValue(inv.createdAt) !== dateFilter) return false;
      if (q) {
        const haystack = `${inv.customerName} ${inv.customerAddress} ${inv.itemsLabel}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, dateFilter, search]);

  const filteredTotal = filtered
    .filter((inv) => inv.status === "active")
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Billing history</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Invoices</h1>
        <p className="mt-1 text-sm text-stone-500">Every invoice ever placed — find one to reprint.</p>
      </header>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-md sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="search">
                Search customer or product
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Acme Corp, or MOUSE"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 sm:w-auto"
              />
            </div>
            {(dateFilter || search) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setSearch("");
                }}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-md">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-stone-900">
                {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
              </h2>
              <p className="text-sm text-stone-500">
                Total: {currency}
                {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-500">
                {invoices.length === 0 ? "No invoices yet." : "No invoices match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                      <th className="whitespace-nowrap px-5 py-3">Invoice</th>
                      <th className="whitespace-nowrap px-5 py-3">Date</th>
                      <th className="whitespace-nowrap px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Items</th>
                      <th className="whitespace-nowrap px-5 py-3">Total</th>
                      <th className="whitespace-nowrap px-5 py-3">Payment</th>
                      <th className="whitespace-nowrap px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const voided = inv.status === "voided";
                      return (
                        <tr
                          key={inv.id}
                          className={`border-b border-stone-50 last:border-0 ${voided ? "opacity-50" : ""}`}
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-medium text-stone-900">
                            <span className={voided ? "line-through" : ""}>{invoiceNumberFor(inv.id)}</span>
                            {voided && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                ⊘ Voided
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-stone-600">
                            {new Date(inv.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-stone-600">
                            {inv.customerName || "Cash / Walk-in"}
                          </td>
                          <td className="max-w-xs px-5 py-3 text-stone-600">{inv.itemsLabel}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-stone-900">
                            {currency}
                            {inv.total.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">
                            {!voided && <PaymentPill status={inv.paymentStatus} />}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">
                            <Link href={`/invoices/${inv.id}`} className="font-medium text-teal-600 hover:underline">
                              View / Print
                            </Link>
                          </td>
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

function PaymentPill({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        ✓ Paid
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        ◐ Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      ! Unpaid
    </span>
  );
}
