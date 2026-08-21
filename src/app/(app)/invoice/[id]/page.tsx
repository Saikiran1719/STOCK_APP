import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById, getSettings } from "@/lib/db";
import PrintButton from "@/components/PrintButton";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const [order, settings] = await Promise.all([getOrderById(orderId), getSettings()]);
  if (!order) {
    notFound();
  }

  const invoiceNumber = `INV-${String(order.id).padStart(6, "0")}`;
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const currency = settings.currencySymbol;

  // Standard Indian intra-state GST invoice: the item's GST rate is split
  // evenly into CGST + SGST. If this business ever bills across states,
  // that half of the invoice should become IGST instead — not handled here.
  const halfRate = order.gstRate / 2;
  const halfGst = order.gstAmount / 2;

  const money = (n: number) => `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-3xl px-8 py-8 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to dashboard
        </Link>
        <PrintButton />
      </div>

      <div className="border-2 border-slate-900 bg-white text-slate-900 print:border-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 p-6">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide">
              {settings.companyName || "Your Company Name"}
            </h1>
            {settings.address && (
              <p className="whitespace-pre-line text-sm text-slate-700">{settings.address}</p>
            )}
            {(settings.phone || settings.email) && (
              <p className="text-sm text-slate-700">
                {[settings.phone && `Ph: ${settings.phone}`, settings.email].filter(Boolean).join("  |  ")}
              </p>
            )}
            {settings.gstin && <p className="text-sm font-medium text-slate-700">GSTIN: {settings.gstin}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold uppercase tracking-widest">Tax Invoice</p>
            <p className="mt-1 text-sm text-slate-700">
              Invoice No: <span className="font-medium">{invoiceNumber}</span>
            </p>
            <p className="text-sm text-slate-700">
              Date: <span className="font-medium">{date}</span>
            </p>
          </div>
        </div>

        {!settings.companyName && (
          <p className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-xs text-amber-800 print:hidden">
            No company details set yet — fill them in on the Settings page so they show up here.
          </p>
        )}

        {/* Bill to */}
        <div className="border-b-2 border-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
          <p className="text-sm font-medium">{order.customerName || "Cash / Walk-in customer"}</p>
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <Th className="text-left">#</Th>
              <Th className="text-left">Description</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Taxable Value</Th>
              <Th className="text-right">CGST</Th>
              <Th className="text-right">SGST</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="text-left">1</Td>
              <Td className="text-left font-medium">{order.productName}</Td>
              <Td className="text-right">{order.qty}</Td>
              <Td className="text-right">{money(order.unitCost)}</Td>
              <Td className="text-right">{money(order.subtotal)}</Td>
              <Td className="text-right">
                {halfRate}%<br />
                {money(halfGst)}
              </Td>
              <Td className="text-right">
                {halfRate}%<br />
                {money(halfGst)}
              </Td>
              <Td className="text-right font-medium">{money(order.total)}</Td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end border-t-2 border-slate-900 p-6">
          <table className="w-64 text-sm">
            <tbody>
              <TotalRow label="Taxable Amount" value={money(order.subtotal)} />
              <TotalRow label={`CGST (${halfRate}%)`} value={money(halfGst)} />
              <TotalRow label={`SGST (${halfRate}%)`} value={money(halfGst)} />
              <tr className="border-t-2 border-slate-900">
                <td className="py-2 text-sm font-bold uppercase">Grand Total</td>
                <td className="py-2 text-right text-base font-bold">{money(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between border-t-2 border-slate-900 p-6">
          <p className="max-w-xs text-xs text-slate-500">{settings.invoiceNote}</p>
          <div className="text-center text-xs text-slate-600">
            <p className="mb-8">For {settings.companyName || "Your Company Name"}</p>
            <p className="border-t border-slate-400 pt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-slate-900 px-3 py-2 align-top ${className}`}>{children}</td>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-slate-600">{label}</td>
      <td className="py-1 text-right">{value}</td>
    </tr>
  );
}
