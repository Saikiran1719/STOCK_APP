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
          <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Sales and GST collected for {monthLabel(month)}.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="month">
            Month
          </label>
          <input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : summary ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Tile label="Invoices" value={summary.invoiceCount} />
            <Tile label="Taxable sales" value={money(summary.subtotal)} />
            <Tile label="GST collected" value={money(summary.gstAmount)} />
            <Tile label="Total billed" value={money(summary.total)} />
            <Tile label="Amount received" value={money(summary.amountPaid)} tone="ok" />
            <Tile
              label="Outstanding"
              value={money(summary.amountOutstanding)}
              tone={summary.amountOutstanding > 0 ? "warn" : "default"}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">GST breakdown by rate</h2>
              <p className="text-xs text-slate-500">Useful for filing returns per slab.</p>
            </div>
            {summary.byGstRate.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No sales this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-5 py-3">GST rate</th>
                      <th className="whitespace-nowrap px-5 py-3">Taxable value</th>
                      <th className="whitespace-nowrap px-5 py-3">GST amount</th>
                      <th className="whitespace-nowrap px-5 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byGstRate.map((row) => (
                      <tr key={row.gstRate} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">
                          {row.gstRate}%
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{money(row.subtotal)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{money(row.gstAmount)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-900">{money(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">Voided invoices are excluded from these totals.</p>
        </>
      ) : null}
    </main>
  );
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
