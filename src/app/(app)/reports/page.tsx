"use client";

import { useEffect, useState } from "react";
import { Th, Td, TABLE_HEAD_ROW } from "@/components/DataTable";
import StatTile from "@/components/StatTile";

type GstRateBreakdown = {
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

type HsnBreakdown = {
  hsnCode: string;
  gstRate: number;
  qty: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

type SupplyCategoryTotals = {
  invoiceCount: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

type ReportSummary = {
  invoiceCount: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  amountOutstanding: number;
  byGstRate: GstRateBreakdown[];
  byHsn: HsnBreakdown[];
  b2b: SupplyCategoryTotals;
  b2c: SupplyCategoryTotals;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [currency, setCurrency] = useState("");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [reportRes, prodRes] = await Promise.all([
          fetch(`/api/reports?month=${month}`),
          fetch("/api/products"),
        ]);
        if (reportRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const reportData = await reportRes.json();
        if (!reportRes.ok) {
          setError(reportData.error || "Failed to load the report.");
          return;
        }
        setSummary(reportData.summary);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setCurrency(prodData.currencySymbol || "");
        }
      } catch {
        setError("Failed to reach the server.");
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  const money = (n: number) =>
    `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Monthly summary</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
          <p className="mt-1 text-sm text-muted">Sales and GST collected for {monthLabel(month)}.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted" htmlFor="month">
            Month
          </label>
          <input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-err">{error}</p>
      ) : summary ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile icon="🧾" label="Invoices" value={summary.invoiceCount} />
            <StatTile icon="💵" label="Taxable sales" value={money(summary.subtotal)} />
            <StatTile icon="🧮" label="GST collected" value={money(summary.gstAmount)} />
            <StatTile icon="📦" label="Total billed" value={money(summary.total)} />
            <StatTile icon="✅" label="Amount received" value={money(summary.amountPaid)} tone="ok" />
            <StatTile
              icon="⏳"
              label="Outstanding"
              value={money(summary.amountOutstanding)}
              tone={summary.amountOutstanding > 0 ? "warn" : "default"}
            />
          </div>

          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">🏢 B2B vs B2C</h2>
              <p className="text-xs text-muted">
                Split by whether the billed party has a GSTIN on file — GSTR-1 Tables 4 (B2B) and 7 (B2C).
              </p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <SupplyCategoryRow label="B2B (has GSTIN)" data={summary.b2b} money={money} />
              <SupplyCategoryRow label="B2C (no GSTIN)" data={summary.b2c} money={money} />
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">🧮 GST breakdown by rate</h2>
              <p className="text-xs text-muted">Useful for filing returns per slab.</p>
            </div>
            {summary.byGstRate.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">No sales this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <Th>GST rate</Th>
                      <Th>Taxable value</Th>
                      <Th>GST amount</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byGstRate.map((row, i) => (
                      <tr key={row.gstRate} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                        <Td className="font-medium text-ink">{row.gstRate}%</Td>
                        <Td className="text-muted">{money(row.subtotal)}</Td>
                        <Td className="text-muted">{money(row.gstAmount)}</Td>
                        <Td className="text-ink">{money(row.total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">🏷️ HSN/SAC summary</h2>
              <p className="text-xs text-muted">GSTR-1 Table 12 — every HSN code billed this period, by rate.</p>
            </div>
            {summary.byHsn.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">No sales this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <Th>HSN/SAC</Th>
                      <Th>Rate</Th>
                      <Th>Qty</Th>
                      <Th>Taxable value</Th>
                      <Th>GST amount</Th>
                      <Th>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byHsn.map((row, i) => (
                      <tr key={`${row.hsnCode}-${row.gstRate}`} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                        <Td className="font-medium text-ink">{row.hsnCode}</Td>
                        <Td className="text-muted">{row.gstRate}%</Td>
                        <Td className="text-muted">{row.qty}</Td>
                        <Td className="text-muted">{money(row.subtotal)}</Td>
                        <Td className="text-muted">{money(row.gstAmount)}</Td>
                        <Td className="text-ink">{money(row.total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Voided invoices are excluded from these totals.</p>
        </>
      ) : null}
    </main>
  );
}

function SupplyCategoryRow({
  label,
  data,
  money,
}: {
  label: string;
  data: SupplyCategoryTotals;
  money: (n: number) => string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{money(data.total)}</p>
      <p className="mt-1 text-xs text-muted">
        {data.invoiceCount} invoice{data.invoiceCount === 1 ? "" : "s"} · taxable {money(data.subtotal)} · GST{" "}
        {money(data.gstAmount)}
      </p>
    </div>
  );
}
