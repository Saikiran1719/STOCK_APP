"use client";

import { useEffect, useState } from "react";

type GstRateBreakdown = {
  gstRate: number;
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
            <Tile icon="🧾" label="Invoices" value={summary.invoiceCount} />
            <Tile icon="💵" label="Taxable sales" value={money(summary.subtotal)} />
            <Tile icon="🧮" label="GST collected" value={money(summary.gstAmount)} />
            <Tile icon="📦" label="Total billed" value={money(summary.total)} />
            <Tile icon="✅" label="Amount received" value={money(summary.amountPaid)} tone="ok" />
            <Tile
              icon="⏳"
              label="Outstanding"
              value={money(summary.amountOutstanding)}
              tone={summary.amountOutstanding > 0 ? "warn" : "default"}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
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
                    <tr className="bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="whitespace-nowrap border-b border-r border-border px-5 py-3">GST rate</th>
                      <th className="whitespace-nowrap border-b border-r border-border px-5 py-3">Taxable value</th>
                      <th className="whitespace-nowrap border-b border-r border-border px-5 py-3">GST amount</th>
                      <th className="whitespace-nowrap border-b border-border px-5 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byGstRate.map((row, i) => (
                      <tr key={row.gstRate} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                        <td className="whitespace-nowrap border-b border-r border-border px-5 py-3 font-medium text-ink">
                          {row.gstRate}%
                        </td>
                        <td className="whitespace-nowrap border-b border-r border-border px-5 py-3 text-muted">
                          {money(row.subtotal)}
                        </td>
                        <td className="whitespace-nowrap border-b border-r border-border px-5 py-3 text-muted">
                          {money(row.gstAmount)}
                        </td>
                        <td className="whitespace-nowrap border-b border-border px-5 py-3 text-ink">
                          {money(row.total)}
                        </td>
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

function Tile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: string;
  label: string;
  value: string | number;
  tone?: "default" | "ok" | "warn";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink";
  const badge = tone === "ok" ? "bg-ok-bg" : tone === "warn" ? "bg-warn-bg" : "bg-accent-soft";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(29,45,62,0.05)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${badge}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`mt-0.5 truncate text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      </div>
    </div>
  );
}
