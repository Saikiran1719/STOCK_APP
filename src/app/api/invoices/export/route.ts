import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

type PaymentStatus = "unpaid" | "partial" | "paid";
type InvoiceStatus = "active" | "voided";

type ExportRow = {
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

function invoiceNumberFor(id: number) {
  return `INV-${String(id).padStart(6, "0")}`;
}

// Matches the app's border/muted-header palette so the sheet still looks
// like it belongs to CounterBook once opened in Excel.
const HEADER_FILL = "FFEEF2F8";
const BORDER_COLOR = "FFB9C2CE";
const MONEY_COLUMNS = ["subtotal", "gst", "total", "paid", "balance"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invoices = (body.invoices ?? []) as ExportRow[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CounterBook";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Invoices");
    sheet.columns = [
      { header: "Invoice No", key: "invoiceNo" },
      { header: "Date", key: "date" },
      { header: "Customer", key: "customer" },
      { header: "Address", key: "address" },
      { header: "Items", key: "items" },
      { header: "Subtotal", key: "subtotal" },
      { header: "GST Amount", key: "gst" },
      { header: "Total", key: "total" },
      { header: "Amount Paid", key: "paid" },
      { header: "Balance Due", key: "balance" },
      { header: "Payment Status", key: "paymentStatus" },
      { header: "Invoice Status", key: "invoiceStatus" },
    ];

    for (const inv of invoices) {
      const voided = inv.status === "voided";
      sheet.addRow({
        invoiceNo: invoiceNumberFor(inv.id),
        date: new Date(inv.createdAt).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        customer: inv.customerName || "Cash / Walk-in",
        address: inv.customerAddress,
        items: inv.itemsLabel,
        subtotal: inv.subtotal,
        gst: inv.gstAmount,
        total: inv.total,
        paid: inv.amountPaid,
        balance: Math.max(0, inv.total - inv.amountPaid),
        paymentStatus: voided ? "-" : inv.paymentStatus,
        invoiceStatus: voided ? "Voided" : "Active",
      });
    }

    // Header row: bold, shaded — Excel's own "Format as header" look.
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };

    // Alt H, B, A — All Borders, on every used cell.
    const thin = { style: "thin" as const, color: { argb: BORDER_COLOR } };
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: thin, left: thin, bottom: thin, right: thin };
      });
    });

    // Money columns: real numbers (not text) with a thousands/₹-style format,
    // right-aligned like Excel does automatically for numeric cells.
    MONEY_COLUMNS.forEach((key) => {
      const column = sheet.getColumn(key);
      column.numFmt = "#,##0.00";
      column.alignment = { horizontal: "right" };
    });

    // Alt H, O, I — AutoFit Column Width, sized off the header and every cell's
    // actual text length (this is what "autofit" resolves to outside a live
    // rendered grid; Excel's own AutoFit still measures against font pixel
    // width, but this tracks it closely for the fonts this sheet uses).
    sheet.columns.forEach((column) => {
      let maxLen = String(column.header ?? "").length;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > maxLen) maxLen = len;
      });
      column.width = Math.min(Math.max(maxLen + 2, 10), 40);
    });

    // Alt W, F, R — Freeze Top Row, so the header stays put while scrolling
    // through a long invoice list.
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="CounterBook-Invoices-${today}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate the Excel file." }, { status: 500 });
  }
}
