"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Invoice = {
  id: number;
  customerName: string;
  customerAddress: string;
  itemsLabel: string;
  subtotal: number;
  gstAmount: number;
  total: number;
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

  const filteredTotal = filtered.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500">Every invoice ever placed — find one to reprint.</p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="search">
                Search customer or product
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Acme Corp, or MOUSE"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-auto"
              />
            </div>
            {(dateFilter || search) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setSearch("");
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-slate-600 hover:bg-gray-50"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
              </h2>
              <p className="text-sm text-slate-500">
                Total: {currency}
                {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                {invoices.length === 0 ? "No invoices yet." : "No invoices match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-5 py-3">Invoice</th>
                      <th className="whitespace-nowrap px-5 py-3">Date</th>
                      <th className="whitespace-nowrap px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Items</th>
                      <th className="whitespace-nowrap px-5 py-3">Total</th>
                      <th className="whitespace-nowrap px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">
                          {invoiceNumberFor(inv.id)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {new Date(inv.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {inv.customerName || "Cash / Walk-in"}
                        </td>
                        <td className="max-w-xs px-5 py-3 text-slate-600">{inv.itemsLabel}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-900">
                          {currency}
                          {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Link href={`/invoices/${inv.id}`} className="font-medium text-blue-700 hover:underline">
                            View / Print
                          </Link>
                        </td>
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
