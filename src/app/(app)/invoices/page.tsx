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

  function handleExportExcel() {
    const header = [
      "Invoice No",
      "Date",
      "Customer",
      "Address",
      "Items",
      "Subtotal",
      "GST Amount",
      "Total",
      "Amount Paid",
      "Balance Due",
      "Payment Status",
      "Invoice Status",
    ];
    const rows = filtered.map((inv) => {
      const voided = inv.status === "voided";
      return [
        invoiceNumberFor(inv.id),
        new Date(inv.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        inv.customerName || "Cash / Walk-in",
        inv.customerAddress,
        inv.itemsLabel,
        inv.subtotal.toFixed(2),
        inv.gstAmount.toFixed(2),
        inv.total.toFixed(2),
        inv.amountPaid.toFixed(2),
        Math.max(0, inv.total - inv.amountPaid).toFixed(2),
        voided ? "-" : inv.paymentStatus,
        voided ? "Voided" : "Active",
      ];
    });

    const csvCell = (value: string) => {
      const s = String(value ?? "");
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

    // A UTF-8 BOM so Excel reads the ₹ symbol and any non-ASCII customer
    // names correctly instead of showing mojibake.
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CounterBook-Invoices-${toDateInputValue(new Date().toISOString())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Billing history</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-muted">Every invoice ever placed — find one to reprint.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(29,45,62,0.05)] sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="search">
                Search customer or product
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Acme Corp, or MOUSE"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">
                {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted">
                  Total: {currency}
                  {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={filtered.length === 0}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent disabled:opacity-45"
                >
                  ↓ Export to Excel
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                {invoices.length === 0 ? "No invoices yet." : "No invoices match these filters."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <Th>Invoice</Th>
                      <Th>Date</Th>
                      <Th>Customer</Th>
                      <Th>Items</Th>
                      <Th align="right">Total</Th>
                      <Th>Payment</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, i) => {
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
                          <Td className="text-muted">{inv.customerName || "Cash / Walk-in"}</Td>
                          <Td className="max-w-xs whitespace-normal text-muted">{inv.itemsLabel}</Td>
                          <Td align="right" className="text-ink">
                            {currency}
                            {inv.total.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
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
