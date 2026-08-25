import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** The GST slabs this app offers — the full standard Indian set, not just what the seed products happened to use. */
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export type Product = {
  id: number;
  name: string;
  cost: number;
  stock: number;
  gstRate: number;
  hsnCode: string;
};

export type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currencySymbol: string;
  invoiceNote: string;
  logoDataUrl: string;
  invoicePrefix: string;
};

export type InvoiceItemInput = { name: string; qty: number };

export type InvoiceItem = {
  productName: string;
  qty: number;
  unitCost: number;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  hsnCode: string;
};

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type InvoiceStatus = "active" | "voided";

export type InvoiceSummary = {
  id: number;
  invoiceNo: string;
  partyId: number | null;
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

export type InvoiceDetail = {
  id: number;
  invoiceNo: string;
  partyId: number | null;
  customerName: string;
  customerAddress: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  discountPercent: number;
  discountAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  voidReason: string | null;
  createdAt: string;
  items: InvoiceItem[];
};

/** Legacy fallback for invoices placed before the invoice_no migration — never used for a new invoice. */
function legacyInvoiceNo(id: number) {
  return `INV-${String(id).padStart(6, "0")}`;
}

/**
 * A reusable customer (or, later, vendor) master — saved once, billed
 * against repeatedly, instead of retyping name/address on every invoice.
 * `type` exists now so a future purchases/vendors milestone can reuse this
 * same table; today only 'customer' rows are ever created.
 */
export type Party = {
  id: number;
  type: "customer" | "vendor";
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  createdAt: string;
};

export type PartyWithBalance = Party & {
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
};

export type PartyInput = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
};

export type PartyResult = { ok: true; party: Party } | { ok: false; error: string };

export type PurchaseItemInput = { name: string; qty: number; unitCost: number };

export type PurchaseItem = {
  productName: string;
  qty: number;
  unitCost: number;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  hsnCode: string;
};

export type PurchaseSummary = {
  id: number;
  partyId: number | null;
  vendorName: string;
  vendorRef: string;
  itemsLabel: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  createdAt: string;
};

export type PurchaseDetail = {
  id: number;
  partyId: number | null;
  vendorName: string;
  vendorRef: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  voidReason: string | null;
  createdAt: string;
  items: PurchaseItem[];
};

export type PlacePurchaseResult =
  | { ok: true; purchaseId: number; total: number }
  | { ok: false; error: string };

export type StockAdjustmentRecord = {
  id: number;
  productName: string;
  qty: number;
  remarks: string;
  newStock: number;
  createdAt: string;
};

export type GstRateBreakdown = {
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

/** One row of a GSTR-1-style HSN summary (return Table 12) — grouped by HSN/SAC + the rate it was billed at. */
export type HsnBreakdown = {
  hsnCode: string;
  gstRate: number;
  qty: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

/** Invoice count + totals for one GSTR-1 supply category — B2B (billed to a party with a GSTIN) or B2C (no GSTIN on file). */
export type SupplyCategoryTotals = {
  invoiceCount: number;
  subtotal: number;
  gstAmount: number;
  total: number;
};

export type ReportSummary = {
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

export type PlaceInvoiceResult =
  | { ok: true; invoiceId: number; total: number }
  | { ok: false; error: string };

export type ProductResult = { ok: true; product: Product } | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** How a payment moved — the same five modes for money coming in and going out. */
export type PaymentMode = "cash" | "bank" | "upi" | "cheque" | "other";

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

/** One row of the payments ledger — a single amount collected from a customer ('in') or paid to a vendor ('out'). */
export type PaymentRecord = {
  id: number;
  direction: "in" | "out";
  partyId: number | null;
  partyName: string;
  invoiceId: number | null;
  purchaseId: number | null;
  amount: number;
  mode: PaymentMode;
  reference: string;
  createdAt: string;
};

export type PaymentRecordResult =
  | { ok: true; paymentId: number; amountPaid: number; balanceDue: number; paymentStatus: PaymentStatus }
  | { ok: false; error: string };

function derivePaymentStatus(total: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= total) return "paid";
  return "partial";
}

const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  currencySymbol: "",
  invoiceNote: "Thank you for your business.",
  logoDataUrl: "",
  invoicePrefix: "INV",
};

/** Hard cap on the stored logo — keeps a single settings row reasonable in size. */
export const MAX_LOGO_DATA_URL_LENGTH = 700_000; // ~500KB image, base64-inflated

function isValidGstRate(rate: number): boolean {
  return (GST_RATES as readonly number[]).includes(rate);
}

/**
 * True until real Supabase credentials are set. While true, every function
 * below runs against an in-memory copy of the data instead of calling
 * Supabase, so the app can be clicked through end to end before a Supabase
 * project exists.
 */
export function isDemoMode(): boolean {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return !url || !key || url.includes("xxxx") || key.includes("xxxx");
}

// --- Demo data store (mirrors the seed data in supabase/schema.sql) ---
let demoProducts: Product[] = [
  { id: 1, name: "MOUSE", cost: 500, stock: 100, gstRate: 18, hsnCode: "8471" },
  { id: 2, name: "KEYBOARD", cost: 1000, stock: 50, gstRate: 18, hsnCode: "8471" },
  { id: 3, name: "MONITER", cost: 5000, stock: 5, gstRate: 18, hsnCode: "8471" },
];
let demoInvoices: InvoiceDetail[] = [];
let demoPurchases: PurchaseDetail[] = [];
let demoStockAdjustments: StockAdjustmentRecord[] = [];
let demoParties: Party[] = [];
let demoPayments: PaymentRecord[] = [];
let demoNextProductId = 4;
let demoNextInvoiceId = 1;
let demoNextPurchaseId = 1;
let demoNextAdjustmentId = 1;
let demoNextPartyId = 1;
let demoNextPaymentId = 1;

/** Shared by getPayments()'s real and demo paths — narrows the ledger to one party/invoice/purchase, or leaves it as the whole history. */
export type PaymentFilter = { partyId?: number; invoiceId?: number; purchaseId?: number };
let demoSettings: Settings = { ...DEFAULT_SETTINGS };

// fy_label -> next number to hand out, mirroring the invoice_number_counters
// table's atomic-upsert behavior for the real backend.
const demoInvoiceCounters = new Map<string, number>();

/** Indian financial year (Apr-Mar) as "25-26", plus the next sequential number for it — the demo-mode mirror of place_invoice()'s numbering logic. */
function nextDemoInvoiceNo(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const fyStart = now.getMonth() >= 3 ? y : y - 1; // getMonth() is 0-based; April = 3
  const fyLabel = `${String(fyStart % 100).padStart(2, "0")}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
  const seq = demoInvoiceCounters.get(fyLabel) ?? 1;
  demoInvoiceCounters.set(fyLabel, seq + 1);
  return `${prefix || "INV"}/${fyLabel}/${String(seq).padStart(5, "0")}`;
}

function getDemoProducts(): Product[] {
  return demoProducts.map((p) => ({ ...p }));
}

/** Exact case-insensitive name match (within the same type) reuses that party; otherwise a new one is created. */
function findOrCreateDemoParty(name: string, address: string, type: "customer" | "vendor" = "customer"): Party {
  const existing = demoParties.find((p) => p.type === type && p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const party: Party = {
    id: demoNextPartyId++,
    type,
    name,
    address,
    phone: "",
    email: "",
    gstin: "",
    createdAt: new Date().toISOString(),
  };
  demoParties.push(party);
  return party;
}

function getDemoPartiesWithBalance(type: "customer" | "vendor" = "customer"): PartyWithBalance[] {
  return demoParties
    .filter((p) => p.type === type)
    .map((p) => {
      // Customers: what they owe us, from invoices. Vendors: what we owe
      // them, from purchases. Same shape, different source table.
      const txs =
        type === "vendor"
          ? demoPurchases.filter((pu) => pu.partyId === p.id && pu.status === "active")
          : demoInvoices.filter((inv) => inv.partyId === p.id && inv.status === "active");
      const totalBilled = txs.reduce((sum, tx) => sum + tx.total, 0);
      const totalPaid = txs.reduce((sum, tx) => sum + tx.amountPaid, 0);
      return {
        ...p,
        invoiceCount: txs.length,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function createDemoParty(input: PartyInput, type: "customer" | "vendor" = "customer"): PartyResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const exists = demoParties.some((p) => p.type === type && p.name.toLowerCase() === name.toLowerCase());
  if (exists) return { ok: false, error: `A party named "${name}" already exists.` };
  const party: Party = {
    id: demoNextPartyId++,
    type,
    name,
    address: (input.address ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    email: (input.email ?? "").trim(),
    gstin: (input.gstin ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  demoParties.push(party);
  return { ok: true, party };
}

function updateDemoParty(id: number, input: PartyInput): PartyResult {
  const party = demoParties.find((p) => p.id === id);
  if (!party) return { ok: false, error: "Party not found." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  party.name = name;
  party.address = (input.address ?? "").trim();
  party.phone = (input.phone ?? "").trim();
  party.email = (input.email ?? "").trim();
  party.gstin = (input.gstin ?? "").trim();
  return { ok: true, party };
}

function getDemoPartyById(id: number): Party | null {
  const party = demoParties.find((p) => p.id === id);
  return party ? { ...party } : null;
}

function getDemoPartyLedger(
  id: number
): { party: Party; invoices: InvoiceSummary[]; purchases: PurchaseSummary[]; payments: PaymentRecord[] } | null {
  const party = getDemoPartyById(id);
  if (!party) return null;
  const payments = getDemoPayments({ partyId: id });
  if (party.type === "vendor") {
    return { party, invoices: [], purchases: getDemoPurchases().filter((pu) => pu.partyId === id), payments };
  }
  return { party, invoices: getDemoInvoices().filter((inv) => inv.partyId === id), purchases: [], payments };
}

function placeDemoInvoice(
  items: InvoiceItemInput[],
  customerName: string,
  customerAddress: string,
  partyId?: number,
  discountPercent = 0
): PlaceInvoiceResult {
  if (items.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }
  if (!customerName.trim()) {
    return { ok: false, error: "Customer name is required." };
  }
  if (!customerAddress.trim()) {
    return { ok: false, error: "Customer address is required." };
  }

  const cleanDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));

  // Validate everything first (all-or-nothing), tracking a running stock
  // balance per product so duplicate lines for the same product are
  // checked cumulatively, same as the real DB transaction does.
  const remainingStock = new Map<string, number>();
  const lines: { product: Product; qty: number }[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      return { ok: false, error: `Enter a valid quantity for ${item.name}.` };
    }
    const product = demoProducts.find(
      (p) => p.name.toLowerCase() === item.name.toLowerCase()
    );
    if (!product) {
      return { ok: false, error: `Product "${item.name}" was not found.` };
    }
    const remaining = remainingStock.has(product.name)
      ? remainingStock.get(product.name)!
      : product.stock;
    if (item.qty > remaining) {
      return { ok: false, error: `Only ${remaining} of ${product.name} in stock.` };
    }
    remainingStock.set(product.name, remaining - item.qty);
    lines.push({ product, qty: item.qty });
  }

  const invoiceItems: InvoiceItem[] = [];
  let grossSubtotal = 0;
  let subtotal = 0;
  let gstAmount = 0;
  let total = 0;

  for (const { product, qty } of lines) {
    product.stock -= qty;
    const grossLine = product.cost * qty;
    const lineSubtotal = grossLine * (1 - cleanDiscountPercent / 100);
    const lineGst = (lineSubtotal * product.gstRate) / 100;
    const lineTotal = lineSubtotal + lineGst;
    invoiceItems.push({
      productName: product.name,
      qty,
      unitCost: product.cost,
      gstRate: product.gstRate,
      subtotal: lineSubtotal,
      gstAmount: lineGst,
      total: lineTotal,
      hsnCode: product.hsnCode,
    });
    grossSubtotal += grossLine;
    subtotal += lineSubtotal;
    gstAmount += lineGst;
    total += lineTotal;
  }

  const resolvedParty = partyId
    ? demoParties.find((p) => p.id === partyId) ?? null
    : findOrCreateDemoParty(customerName.trim(), customerAddress.trim());

  const invoice: InvoiceDetail = {
    id: demoNextInvoiceId++,
    invoiceNo: nextDemoInvoiceNo(demoSettings.invoicePrefix),
    partyId: resolvedParty?.id ?? null,
    customerName: customerName.trim(),
    customerAddress: customerAddress.trim(),
    subtotal,
    gstAmount,
    total,
    discountPercent: cleanDiscountPercent,
    discountAmount: grossSubtotal - subtotal,
    amountPaid: 0,
    paymentStatus: "unpaid",
    status: "active",
    voidReason: null,
    createdAt: new Date().toISOString(),
    items: invoiceItems,
  };
  demoInvoices.push(invoice);

  return { ok: true, invoiceId: invoice.id, total };
}

function getDemoInvoices(): InvoiceSummary[] {
  return demoInvoices
    .slice()
    .reverse()
    .map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      partyId: inv.partyId,
      customerName: inv.customerName,
      customerAddress: inv.customerAddress,
      itemsLabel: inv.items.map((it) => `${it.productName} x${it.qty}`).join(", "),
      subtotal: inv.subtotal,
      gstAmount: inv.gstAmount,
      total: inv.total,
      amountPaid: inv.amountPaid,
      paymentStatus: inv.paymentStatus,
      status: inv.status,
      createdAt: inv.createdAt,
    }));
}

function getDemoInvoiceById(id: number): InvoiceDetail | null {
  const invoice = demoInvoices.find((inv) => inv.id === id);
  return invoice ? { ...invoice, items: invoice.items.map((it) => ({ ...it })) } : null;
}

function recordDemoInvoicePayment(
  id: number,
  amount: number,
  mode: PaymentMode,
  reference: string
): PaymentRecordResult {
  const invoice = demoInvoices.find((inv) => inv.id === id);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "voided") {
    return { ok: false, error: "Cannot record payment on a voided invoice." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }
  const balance = invoice.total - invoice.amountPaid;
  if (amount > balance + 1e-9) {
    return { ok: false, error: `Amount exceeds the balance due (${balance.toFixed(2)}).` };
  }

  demoPayments.push({
    id: demoNextPaymentId++,
    direction: "in",
    partyId: invoice.partyId,
    partyName: invoice.customerName,
    invoiceId: invoice.id,
    purchaseId: null,
    amount,
    mode,
    reference,
    createdAt: new Date().toISOString(),
  });

  invoice.amountPaid += amount;
  invoice.paymentStatus = derivePaymentStatus(invoice.total, invoice.amountPaid);
  return {
    ok: true,
    paymentId: demoNextPaymentId - 1,
    amountPaid: invoice.amountPaid,
    balanceDue: invoice.total - invoice.amountPaid,
    paymentStatus: invoice.paymentStatus,
  };
}

function voidDemoInvoice(id: number, reason: string): SimpleResult {
  const invoice = demoInvoices.find((inv) => inv.id === id);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "voided") return { ok: false, error: "This invoice is already voided." };

  for (const item of invoice.items) {
    const product = demoProducts.find((p) => p.name === item.productName);
    if (product) product.stock += item.qty;
  }

  invoice.status = "voided";
  invoice.voidReason = reason;
  return { ok: true };
}

function placeDemoPurchase(
  items: PurchaseItemInput[],
  vendorName: string,
  vendorRef: string,
  partyId?: number
): PlacePurchaseResult {
  if (items.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }
  if (!vendorName.trim()) {
    return { ok: false, error: "Vendor name is required." };
  }

  const lines: { product: Product; qty: number; unitCost: number }[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      return { ok: false, error: `Enter a valid quantity for ${item.name}.` };
    }
    if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
      return { ok: false, error: `Enter a valid cost for ${item.name}.` };
    }
    const product = demoProducts.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
    if (!product) {
      return { ok: false, error: `Product "${item.name}" was not found.` };
    }
    lines.push({ product, qty: item.qty, unitCost: item.unitCost });
  }

  const purchaseItems: PurchaseItem[] = [];
  let subtotal = 0;
  let gstAmount = 0;
  let total = 0;

  for (const { product, qty, unitCost } of lines) {
    product.stock += qty;
    const lineSubtotal = unitCost * qty;
    const lineGst = (lineSubtotal * product.gstRate) / 100;
    const lineTotal = lineSubtotal + lineGst;
    purchaseItems.push({
      productName: product.name,
      qty,
      unitCost,
      gstRate: product.gstRate,
      subtotal: lineSubtotal,
      gstAmount: lineGst,
      total: lineTotal,
      hsnCode: product.hsnCode,
    });
    subtotal += lineSubtotal;
    gstAmount += lineGst;
    total += lineTotal;
  }

  const resolvedParty = partyId
    ? demoParties.find((p) => p.id === partyId) ?? null
    : findOrCreateDemoParty(vendorName.trim(), "", "vendor");

  const purchase: PurchaseDetail = {
    id: demoNextPurchaseId++,
    partyId: resolvedParty?.id ?? null,
    vendorName: vendorName.trim(),
    vendorRef: vendorRef.trim(),
    subtotal,
    gstAmount,
    total,
    amountPaid: 0,
    paymentStatus: "unpaid",
    status: "active",
    voidReason: null,
    createdAt: new Date().toISOString(),
    items: purchaseItems,
  };
  demoPurchases.push(purchase);

  return { ok: true, purchaseId: purchase.id, total };
}

function getDemoPurchases(): PurchaseSummary[] {
  return demoPurchases
    .slice()
    .reverse()
    .map((pu) => ({
      id: pu.id,
      partyId: pu.partyId,
      vendorName: pu.vendorName,
      vendorRef: pu.vendorRef,
      itemsLabel: pu.items.map((it) => `${it.productName} x${it.qty}`).join(", "),
      subtotal: pu.subtotal,
      gstAmount: pu.gstAmount,
      total: pu.total,
      amountPaid: pu.amountPaid,
      paymentStatus: pu.paymentStatus,
      status: pu.status,
      createdAt: pu.createdAt,
    }));
}

function getDemoPurchaseById(id: number): PurchaseDetail | null {
  const purchase = demoPurchases.find((pu) => pu.id === id);
  return purchase ? { ...purchase, items: purchase.items.map((it) => ({ ...it })) } : null;
}

function recordDemoPurchasePayment(
  id: number,
  amount: number,
  mode: PaymentMode,
  reference: string
): PaymentRecordResult {
  const purchase = demoPurchases.find((pu) => pu.id === id);
  if (!purchase) return { ok: false, error: "Purchase not found." };
  if (purchase.status === "voided") {
    return { ok: false, error: "Cannot record payment on a voided purchase." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }
  const balance = purchase.total - purchase.amountPaid;
  if (amount > balance + 1e-9) {
    return { ok: false, error: `Amount exceeds the balance due (${balance.toFixed(2)}).` };
  }

  demoPayments.push({
    id: demoNextPaymentId++,
    direction: "out",
    partyId: purchase.partyId,
    partyName: purchase.vendorName,
    invoiceId: null,
    purchaseId: purchase.id,
    amount,
    mode,
    reference,
    createdAt: new Date().toISOString(),
  });

  purchase.amountPaid += amount;
  purchase.paymentStatus = derivePaymentStatus(purchase.total, purchase.amountPaid);
  return {
    ok: true,
    paymentId: demoNextPaymentId - 1,
    amountPaid: purchase.amountPaid,
    balanceDue: purchase.total - purchase.amountPaid,
    paymentStatus: purchase.paymentStatus,
  };
}

function getDemoPayments(filter?: PaymentFilter): PaymentRecord[] {
  return demoPayments
    .filter((p) => filter?.partyId == null || p.partyId === filter.partyId)
    .filter((p) => filter?.invoiceId == null || p.invoiceId === filter.invoiceId)
    .filter((p) => filter?.purchaseId == null || p.purchaseId === filter.purchaseId)
    .slice()
    .reverse();
}

function voidDemoPurchase(id: number, reason: string): SimpleResult {
  const purchase = demoPurchases.find((pu) => pu.id === id);
  if (!purchase) return { ok: false, error: "Purchase not found." };
  if (purchase.status === "voided") return { ok: false, error: "This purchase is already voided." };

  for (const item of purchase.items) {
    const product = demoProducts.find((p) => p.name === item.productName);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  }

  purchase.status = "voided";
  purchase.voidReason = reason;
  return { ok: true };
}

function getDemoStockAdjustments(): StockAdjustmentRecord[] {
  return demoStockAdjustments.slice().reverse();
}

function getDemoReportSummary(fromISO: string, toISO: string): ReportSummary {
  const inRange = demoInvoices.filter(
    (inv) => inv.status === "active" && inv.createdAt >= fromISO && inv.createdAt <= toISO
  );

  const byRate = new Map<number, GstRateBreakdown>();
  const byHsn = new Map<string, HsnBreakdown>();
  let subtotal = 0;
  let gstAmount = 0;
  let total = 0;
  let amountPaid = 0;
  const b2b: SupplyCategoryTotals = { invoiceCount: 0, subtotal: 0, gstAmount: 0, total: 0 };
  const b2c: SupplyCategoryTotals = { invoiceCount: 0, subtotal: 0, gstAmount: 0, total: 0 };

  for (const inv of inRange) {
    subtotal += inv.subtotal;
    gstAmount += inv.gstAmount;
    total += inv.total;
    amountPaid += inv.amountPaid;

    const party = inv.partyId != null ? demoParties.find((p) => p.id === inv.partyId) : null;
    const bucket2 = party?.gstin.trim() ? b2b : b2c;
    bucket2.invoiceCount += 1;
    bucket2.subtotal += inv.subtotal;
    bucket2.gstAmount += inv.gstAmount;
    bucket2.total += inv.total;

    for (const item of inv.items) {
      const bucket = byRate.get(item.gstRate) ?? {
        gstRate: item.gstRate,
        subtotal: 0,
        gstAmount: 0,
        total: 0,
      };
      bucket.subtotal += item.subtotal;
      bucket.gstAmount += item.gstAmount;
      bucket.total += item.total;
      byRate.set(item.gstRate, bucket);

      const hsnKey = `${item.hsnCode || "—"}|${item.gstRate}`;
      const hsnBucket = byHsn.get(hsnKey) ?? {
        hsnCode: item.hsnCode || "—",
        gstRate: item.gstRate,
        qty: 0,
        subtotal: 0,
        gstAmount: 0,
        total: 0,
      };
      hsnBucket.qty += item.qty;
      hsnBucket.subtotal += item.subtotal;
      hsnBucket.gstAmount += item.gstAmount;
      hsnBucket.total += item.total;
      byHsn.set(hsnKey, hsnBucket);
    }
  }

  return {
    invoiceCount: inRange.length,
    subtotal,
    gstAmount,
    total,
    amountPaid,
    amountOutstanding: total - amountPaid,
    byGstRate: Array.from(byRate.values()).sort((a, b) => a.gstRate - b.gstRate),
    byHsn: Array.from(byHsn.values()).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode)),
    b2b,
    b2c,
  };
}

function createDemoProduct(
  name: string,
  cost: number,
  stock: number,
  gstRate: number,
  hsnCode: string
): ProductResult {
  const exists = demoProducts.some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { ok: false, error: `Product "${name}" already exists.` };
  }
  const product: Product = { id: demoNextProductId++, name, cost, stock, gstRate, hsnCode };
  demoProducts.push(product);
  return { ok: true, product };
}

function restockDemo(name: string, qty: number): ProductResult {
  const product = demoProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!product) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  product.stock += qty;
  return { ok: true, product: { ...product } };
}

function removeDemoStock(name: string, qty: number, remarks: string): ProductResult {
  const product = demoProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!product) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  if (qty > product.stock) {
    return { ok: false, error: `Only ${product.stock} of ${product.name} in stock.` };
  }
  product.stock -= qty;
  demoStockAdjustments.push({
    id: demoNextAdjustmentId++,
    productName: product.name,
    qty,
    remarks,
    newStock: product.stock,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, product: { ...product } };
}

function updateDemoProduct(name: string, cost: number, gstRate: number, hsnCode: string): ProductResult {
  const product = demoProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!product) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  product.cost = cost;
  product.gstRate = gstRate;
  product.hsnCode = hsnCode;
  return { ok: true, product: { ...product } };
}

// Postgres `numeric` columns come back from PostgREST as strings (to avoid
// float precision loss), so every row read from the real backend needs its
// cost/gst_rate normalized back to a JS number.
function toProduct(row: {
  id: number;
  name: string;
  cost: unknown;
  stock: number;
  gst_rate: unknown;
  // Optional: increment_stock/decrement_stock (restock, manual removal)
  // don't select hsn_code — those flows don't need it, and adding it there
  // would mean another RETURNS TABLE signature change for no real benefit.
  hsn_code?: string | null;
}): Product {
  return {
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    stock: row.stock,
    gstRate: Number(row.gst_rate),
    hsnCode: row.hsn_code ?? "",
  };
}

// Postgres exception messages from place_invoice come through roughly as
// raised, e.g. "not_found:MOUSE" or "insufficient_stock:MOUSE:5".
function parseInvoiceError(message: string): string {
  const notFound = message.match(/not_found:(.+)/);
  if (notFound) return `Product "${notFound[1]}" was not found.`;

  const insufficient = message.match(/insufficient_stock:([^:]+):(\d+)/);
  if (insufficient) return `Only ${insufficient[2]} of ${insufficient[1]} in stock.`;

  if (message.includes("no_items")) return "Add at least one item.";
  if (message.includes("customer_name_required")) return "Customer name is required.";
  if (message.includes("customer_address_required")) return "Customer address is required.";

  return "Failed to place the order. Please try again.";
}

// Postgres exception messages from record_purchase, same idea as parseInvoiceError above.
function parsePurchaseError(message: string): string {
  const notFound = message.match(/not_found:(.+)/);
  if (notFound) return `Product "${notFound[1]}" was not found.`;

  const invalidCost = message.match(/invalid_cost:(.+)/);
  if (invalidCost) return `Enter a valid cost for ${invalidCost[1]}.`;

  if (message.includes("no_items")) return "Add at least one item.";
  if (message.includes("vendor_name_required")) return "Vendor name is required.";

  return "Failed to record the purchase. Please try again.";
}

// Postgres exception messages from record_invoice_payment / record_purchase_payment.
function parsePaymentError(message: string): string {
  if (message.includes("invoice_not_found")) return "Invoice not found.";
  if (message.includes("purchase_not_found")) return "Purchase not found.";
  if (message.includes("invoice_voided")) return "Cannot record payment on a voided invoice.";
  if (message.includes("purchase_voided")) return "Cannot record payment on a voided purchase.";
  if (message.includes("invalid_amount")) return "Enter an amount greater than 0.";

  const exceeds = message.match(/exceeds_balance:([\d.]+)/);
  if (exceeds) return `Amount exceeds the balance due (${Number(exceeds[1]).toFixed(2)}).`;

  return "Failed to record the payment. Please try again.";
}

// --- Real Supabase backend ---
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
      );
    }
    // Service-role key: only ever used server-side (API routes), never sent to the browser.
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function getProducts(): Promise<Product[]> {
  if (isDemoMode()) {
    return getDemoProducts();
  }

  const { data, error } = await getClient()
    .from("products")
    .select("id, name, cost, stock, gst_rate, hsn_code")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function createProduct(
  name: string,
  cost: number,
  stock: number,
  gstRate: number,
  hsnCode = ""
): Promise<ProductResult> {
  if (!name.trim()) return { ok: false, error: "Product name is required." };
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, error: "Cost must be 0 or more." };
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, error: "Initial stock must be a whole number, 0 or more." };
  }
  if (!isValidGstRate(gstRate)) {
    return { ok: false, error: `GST rate must be one of: ${GST_RATES.join("%, ")}%.` };
  }

  if (isDemoMode()) {
    return createDemoProduct(name.trim(), cost, stock, gstRate, hsnCode.trim());
  }

  const { data, error } = await getClient()
    .from("products")
    .insert({ name: name.trim(), cost, stock, gst_rate: gstRate, hsn_code: hsnCode.trim() })
    .select("id, name, cost, stock, gst_rate, hsn_code")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Product "${name}" already exists.` };
    }
    throw error;
  }
  return { ok: true, product: toProduct(data) };
}

/** Adds qty to a product's stock — used by the Stock Entry "add stock" form. */
export async function restock(name: string, qty: number): Promise<ProductResult> {
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: "Enter a valid quantity to add." };
  }

  if (isDemoMode()) {
    return restockDemo(name, qty);
  }

  const { data, error } = await getClient().rpc("increment_stock", {
    p_name: name,
    p_qty: qty,
  });
  if (error) throw error;

  const row = (data as Parameters<typeof toProduct>[0][] | null)?.[0];
  if (!row) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  return { ok: true, product: toProduct(row) };
}

/**
 * Manually removes qty from a product's stock — for reconciling a physical
 * stock count. Remarks are required so there's always a reason on record.
 */
export async function removeStock(
  name: string,
  qty: number,
  remarks: string
): Promise<ProductResult> {
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: "Enter a valid quantity to remove." };
  }
  const cleanRemarks = remarks.trim();
  if (!cleanRemarks) {
    return { ok: false, error: "Remarks are required for a stock correction." };
  }

  if (isDemoMode()) {
    return removeDemoStock(name, qty, cleanRemarks);
  }

  const supabase = getClient();
  const { data, error } = await supabase.rpc("decrement_stock", { p_name: name, p_qty: qty });
  if (error) throw error;

  const row = (data as Parameters<typeof toProduct>[0][] | null)?.[0];
  if (!row) {
    const { data: existing } = await supabase
      .from("products")
      .select("stock")
      .eq("name", name)
      .maybeSingle();
    if (!existing) return { ok: false, error: `Product "${name}" was not found.` };
    return { ok: false, error: `Only ${existing.stock} of ${name} in stock.` };
  }

  const { error: logError } = await supabase.from("stock_adjustments").insert({
    product_id: row.id,
    product_name: row.name,
    qty,
    remarks: cleanRemarks,
    new_stock: row.stock,
  });
  if (logError) {
    console.error("Failed to log stock adjustment:", logError);
  }

  return { ok: true, product: toProduct(row) };
}

/** Sets a product's cost, GST rate, and HSN/SAC code — used by the Stock Entry "Edit product" form. */
export async function updateProduct(
  name: string,
  cost: number,
  gstRate: number,
  hsnCode = ""
): Promise<ProductResult> {
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, error: "Cost must be 0 or more." };
  }
  if (!isValidGstRate(gstRate)) {
    return { ok: false, error: `GST rate must be one of: ${GST_RATES.join("%, ")}%.` };
  }

  if (isDemoMode()) {
    return updateDemoProduct(name, cost, gstRate, hsnCode.trim());
  }

  const { data, error } = await getClient()
    .from("products")
    .update({ cost, gst_rate: gstRate, hsn_code: hsnCode.trim() })
    .eq("name", name)
    .select("id, name, cost, stock, gst_rate, hsn_code")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  return { ok: true, product: toProduct(data) };
}

/**
 * Places a multi-item invoice. The Supabase path runs entirely inside the
 * place_invoice Postgres function (see supabase/schema.sql) — every item's
 * stock check + decrement + line row, plus the invoice header, happen in
 * one transaction, so a failure partway through (e.g. item 2 of 3 is out of
 * stock) rolls back item 1's stock change too. No partial invoices.
 */
export async function placeInvoice(
  items: InvoiceItemInput[],
  customerName: string,
  customerAddress: string,
  partyId?: number,
  discountPercent = 0
): Promise<PlaceInvoiceResult> {
  const cleanItems = items
    .map((it) => ({ name: (it.name ?? "").trim(), qty: Number(it.qty) }))
    .filter((it) => it.name.length > 0);

  if (cleanItems.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }
  for (const it of cleanItems) {
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      return { ok: false, error: `Enter a valid quantity for ${it.name}.` };
    }
  }

  const cleanCustomerName = (customerName ?? "").trim();
  const cleanCustomerAddress = (customerAddress ?? "").trim();
  if (!cleanCustomerName) {
    return { ok: false, error: "Customer name is required." };
  }
  if (!cleanCustomerAddress) {
    return { ok: false, error: "Customer address is required." };
  }

  const cleanDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));

  if (isDemoMode()) {
    return placeDemoInvoice(cleanItems, cleanCustomerName, cleanCustomerAddress, partyId, cleanDiscountPercent);
  }

  const { data, error } = await getClient().rpc("place_invoice", {
    p_customer_name: cleanCustomerName,
    p_customer_address: cleanCustomerAddress,
    p_items: cleanItems,
    p_party_id: partyId ?? null,
    p_discount_percent: cleanDiscountPercent,
  });

  if (error) {
    return { ok: false, error: parseInvoiceError(error.message) };
  }

  const row = (data as { invoice_id: number; invoice_total: unknown }[] | null)?.[0];
  if (!row) {
    return { ok: false, error: "Failed to place the order. Please try again." };
  }

  return { ok: true, invoiceId: row.invoice_id, total: Number(row.invoice_total) };
}

const INVOICE_SUMMARY_SELECT =
  "id, invoice_no, party_id, customer_name, customer_address, subtotal, gst_amount, total, amount_paid, status, created_at, invoice_items(product_name, qty)";

type InvoiceSummaryRow = {
  id: number;
  invoice_no: string | null;
  party_id: number | null;
  customer_name: string | null;
  customer_address: string | null;
  subtotal: unknown;
  gst_amount: unknown;
  total: unknown;
  amount_paid: unknown;
  status: string | null;
  created_at: string;
  invoice_items: { product_name: string; qty: number }[] | null;
};

function toInvoiceSummary(inv: InvoiceSummaryRow): InvoiceSummary {
  const total = Number(inv.total);
  const amountPaid = Number(inv.amount_paid ?? 0);
  return {
    id: inv.id,
    invoiceNo: inv.invoice_no || legacyInvoiceNo(inv.id),
    partyId: inv.party_id ?? null,
    customerName: inv.customer_name ?? "",
    customerAddress: inv.customer_address ?? "",
    itemsLabel: (inv.invoice_items ?? []).map((it) => `${it.product_name} x${it.qty}`).join(", "),
    subtotal: Number(inv.subtotal),
    gstAmount: Number(inv.gst_amount),
    total,
    amountPaid,
    paymentStatus: derivePaymentStatus(total, amountPaid),
    status: (inv.status ?? "active") as InvoiceStatus,
    createdAt: inv.created_at,
  };
}

export async function getInvoices(): Promise<InvoiceSummary[]> {
  if (isDemoMode()) {
    return getDemoInvoices();
  }

  const { data, error } = await getClient()
    .from("invoices")
    .select(INVOICE_SUMMARY_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toInvoiceSummary);
}

export async function getInvoiceById(id: number): Promise<InvoiceDetail | null> {
  if (isDemoMode()) {
    return getDemoInvoiceById(id);
  }

  const { data, error } = await getClient()
    .from("invoices")
    .select(
      "id, invoice_no, party_id, customer_name, customer_address, subtotal, gst_amount, total, discount_percent, discount_amount, amount_paid, status, void_reason, created_at, invoice_items(product_name, qty, unit_cost, gst_rate, subtotal, gst_amount, total, hsn_code)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type ItemRow = {
    product_name: string;
    qty: number;
    unit_cost: unknown;
    gst_rate: unknown;
    subtotal: unknown;
    gst_amount: unknown;
    total: unknown;
    hsn_code: string | null;
  };

  const total = Number(data.total);
  const amountPaid = Number(data.amount_paid ?? 0);

  return {
    id: data.id,
    invoiceNo: data.invoice_no || legacyInvoiceNo(data.id),
    partyId: data.party_id ?? null,
    customerName: data.customer_name ?? "",
    customerAddress: data.customer_address ?? "",
    subtotal: Number(data.subtotal),
    gstAmount: Number(data.gst_amount),
    total,
    discountPercent: Number(data.discount_percent ?? 0),
    discountAmount: Number(data.discount_amount ?? 0),
    amountPaid,
    paymentStatus: derivePaymentStatus(total, amountPaid),
    status: (data.status ?? "active") as InvoiceStatus,
    voidReason: data.void_reason ?? null,
    createdAt: data.created_at,
    items: ((data.invoice_items ?? []) as ItemRow[]).map((it) => ({
      productName: it.product_name,
      qty: it.qty,
      unitCost: Number(it.unit_cost),
      gstRate: Number(it.gst_rate),
      subtotal: Number(it.subtotal),
      gstAmount: Number(it.gst_amount),
      total: Number(it.total),
      hsnCode: it.hsn_code ?? "",
    })),
  };
}

/**
 * Records a payment collected against an invoice — an amount to ADD to
 * what's already been paid, with a mode and optional reference, rather
 * than a new absolute total. Runs inside record_invoice_payment (see
 * supabase/schema.sql), so logging the payment and updating the invoice's
 * running amount_paid happen atomically.
 */
export async function recordInvoicePayment(
  id: number,
  amount: number,
  mode: PaymentMode = "cash",
  reference = ""
): Promise<PaymentRecordResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }
  const cleanMode: PaymentMode = PAYMENT_MODES.some((m) => m.value === mode) ? mode : "cash";
  const cleanReference = (reference ?? "").trim();

  if (isDemoMode()) {
    return recordDemoInvoicePayment(id, amount, cleanMode, cleanReference);
  }

  const { data, error } = await getClient().rpc("record_invoice_payment", {
    p_invoice_id: id,
    p_amount: amount,
    p_mode: cleanMode,
    p_reference: cleanReference,
  });

  if (error) {
    return { ok: false, error: parsePaymentError(error.message) };
  }

  const row = (data as { payment_id: number; amount_paid: unknown; balance_due: unknown }[] | null)?.[0];
  if (!row) return { ok: false, error: "Failed to record the payment. Please try again." };

  const amountPaid = Number(row.amount_paid);
  const balanceDue = Number(row.balance_due);
  return {
    ok: true,
    paymentId: row.payment_id,
    amountPaid,
    balanceDue,
    paymentStatus: derivePaymentStatus(amountPaid + balanceDue, amountPaid),
  };
}

/**
 * Voids an invoice: restores stock for every line item and marks it voided,
 * atomically (see void_invoice in supabase/schema.sql). Requires a reason.
 */
export async function voidInvoice(id: number, reason: string): Promise<SimpleResult> {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { ok: false, error: "A reason is required to void an invoice." };
  }

  if (isDemoMode()) {
    return voidDemoInvoice(id, cleanReason);
  }

  const { error } = await getClient().rpc("void_invoice", {
    p_invoice_id: id,
    p_reason: cleanReason,
  });

  if (error) {
    if (error.message.includes("invoice_not_found")) {
      return { ok: false, error: "Invoice not found." };
    }
    if (error.message.includes("already_voided")) {
      return { ok: false, error: "This invoice is already voided." };
    }
    throw error;
  }

  return { ok: true };
}

const PURCHASE_SUMMARY_SELECT =
  "id, party_id, vendor_name, vendor_ref, subtotal, gst_amount, total, amount_paid, status, created_at, purchase_items(product_name, qty)";

type PurchaseSummaryRow = {
  id: number;
  party_id: number | null;
  vendor_name: string;
  vendor_ref: string | null;
  subtotal: unknown;
  gst_amount: unknown;
  total: unknown;
  amount_paid: unknown;
  status: string | null;
  created_at: string;
  purchase_items: { product_name: string; qty: number }[] | null;
};

function toPurchaseSummary(pu: PurchaseSummaryRow): PurchaseSummary {
  const total = Number(pu.total);
  const amountPaid = Number(pu.amount_paid ?? 0);
  return {
    id: pu.id,
    partyId: pu.party_id ?? null,
    vendorName: pu.vendor_name ?? "",
    vendorRef: pu.vendor_ref ?? "",
    itemsLabel: (pu.purchase_items ?? []).map((it) => `${it.product_name} x${it.qty}`).join(", "),
    subtotal: Number(pu.subtotal),
    gstAmount: Number(pu.gst_amount),
    total,
    amountPaid,
    paymentStatus: derivePaymentStatus(total, amountPaid),
    status: (pu.status ?? "active") as InvoiceStatus,
    createdAt: pu.created_at,
  };
}

/**
 * Records a vendor bill and stocks in every item — the purchase-side
 * mirror of placeInvoice(). The Supabase path runs entirely inside the
 * record_purchase Postgres function (see supabase/schema.sql), so a
 * failure partway through rolls back every item's stock change too.
 */
export async function recordPurchase(
  items: PurchaseItemInput[],
  vendorName: string,
  vendorRef: string,
  partyId?: number
): Promise<PlacePurchaseResult> {
  const cleanItems = items
    .map((it) => ({ name: (it.name ?? "").trim(), qty: Number(it.qty), unitCost: Number(it.unitCost) }))
    .filter((it) => it.name.length > 0);

  if (cleanItems.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }
  for (const it of cleanItems) {
    if (!Number.isInteger(it.qty) || it.qty <= 0) {
      return { ok: false, error: `Enter a valid quantity for ${it.name}.` };
    }
    if (!Number.isFinite(it.unitCost) || it.unitCost < 0) {
      return { ok: false, error: `Enter a valid cost for ${it.name}.` };
    }
  }

  const cleanVendorName = (vendorName ?? "").trim();
  const cleanVendorRef = (vendorRef ?? "").trim();
  if (!cleanVendorName) {
    return { ok: false, error: "Vendor name is required." };
  }

  if (isDemoMode()) {
    return placeDemoPurchase(cleanItems, cleanVendorName, cleanVendorRef, partyId);
  }

  const { data, error } = await getClient().rpc("record_purchase", {
    p_vendor_name: cleanVendorName,
    p_vendor_ref: cleanVendorRef,
    p_items: cleanItems.map((it) => ({ name: it.name, qty: it.qty, unitCost: it.unitCost })),
    p_party_id: partyId ?? null,
  });

  if (error) {
    return { ok: false, error: parsePurchaseError(error.message) };
  }

  const row = (data as { purchase_id: number; purchase_total: unknown }[] | null)?.[0];
  if (!row) {
    return { ok: false, error: "Failed to record the purchase. Please try again." };
  }

  return { ok: true, purchaseId: row.purchase_id, total: Number(row.purchase_total) };
}

export async function getPurchases(): Promise<PurchaseSummary[]> {
  if (isDemoMode()) {
    return getDemoPurchases();
  }

  const { data, error } = await getClient()
    .from("purchases")
    .select(PURCHASE_SUMMARY_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toPurchaseSummary);
}

export async function getPurchaseById(id: number): Promise<PurchaseDetail | null> {
  if (isDemoMode()) {
    return getDemoPurchaseById(id);
  }

  const { data, error } = await getClient()
    .from("purchases")
    .select(
      "id, party_id, vendor_name, vendor_ref, subtotal, gst_amount, total, amount_paid, status, void_reason, created_at, purchase_items(product_name, qty, unit_cost, gst_rate, subtotal, gst_amount, total, hsn_code)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type ItemRow = {
    product_name: string;
    qty: number;
    unit_cost: unknown;
    gst_rate: unknown;
    subtotal: unknown;
    gst_amount: unknown;
    total: unknown;
    hsn_code: string | null;
  };

  const total = Number(data.total);
  const amountPaid = Number(data.amount_paid ?? 0);

  return {
    id: data.id,
    partyId: data.party_id ?? null,
    vendorName: data.vendor_name ?? "",
    vendorRef: data.vendor_ref ?? "",
    subtotal: Number(data.subtotal),
    gstAmount: Number(data.gst_amount),
    total,
    amountPaid,
    paymentStatus: derivePaymentStatus(total, amountPaid),
    status: (data.status ?? "active") as InvoiceStatus,
    voidReason: data.void_reason ?? null,
    createdAt: data.created_at,
    items: ((data.purchase_items ?? []) as ItemRow[]).map((it) => ({
      productName: it.product_name,
      qty: it.qty,
      unitCost: Number(it.unit_cost),
      gstRate: Number(it.gst_rate),
      subtotal: Number(it.subtotal),
      gstAmount: Number(it.gst_amount),
      total: Number(it.total),
      hsnCode: it.hsn_code ?? "",
    })),
  };
}

/**
 * Records a payment made against a purchase — what you've paid the
 * vendor — the purchase-side mirror of recordInvoicePayment() above.
 */
export async function recordPurchasePayment(
  id: number,
  amount: number,
  mode: PaymentMode = "cash",
  reference = ""
): Promise<PaymentRecordResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }
  const cleanMode: PaymentMode = PAYMENT_MODES.some((m) => m.value === mode) ? mode : "cash";
  const cleanReference = (reference ?? "").trim();

  if (isDemoMode()) {
    return recordDemoPurchasePayment(id, amount, cleanMode, cleanReference);
  }

  const { data, error } = await getClient().rpc("record_purchase_payment", {
    p_purchase_id: id,
    p_amount: amount,
    p_mode: cleanMode,
    p_reference: cleanReference,
  });

  if (error) {
    return { ok: false, error: parsePaymentError(error.message) };
  }

  const row = (data as { payment_id: number; amount_paid: unknown; balance_due: unknown }[] | null)?.[0];
  if (!row) return { ok: false, error: "Failed to record the payment. Please try again." };

  const amountPaid = Number(row.amount_paid);
  const balanceDue = Number(row.balance_due);
  return {
    ok: true,
    paymentId: row.payment_id,
    amountPaid,
    balanceDue,
    paymentStatus: derivePaymentStatus(amountPaid + balanceDue, amountPaid),
  };
}

const PAYMENT_SELECT = "id, direction, party_id, invoice_id, purchase_id, amount, mode, reference, created_at";

type PaymentSelectRow = {
  id: number;
  direction: string;
  party_id: number | null;
  invoice_id: number | null;
  purchase_id: number | null;
  amount: unknown;
  mode: string | null;
  reference: string | null;
  created_at: string;
};

/**
 * The payments ledger, newest first — every rupee collected from a
 * customer or paid to a vendor. Pass a filter to scope it to one party, or
 * one specific invoice/purchase; omit it for the full Cash & Bank history.
 * Party names are fetched in a second pass and merged in, same two-query
 * approach getParties() uses, rather than relying on PostgREST's embedded-
 * relationship shape (which varies by how the FK is declared).
 */
export async function getPayments(filter?: PaymentFilter): Promise<PaymentRecord[]> {
  if (isDemoMode()) {
    return getDemoPayments(filter);
  }

  const supabase = getClient();
  let query = supabase.from("payments").select(PAYMENT_SELECT).order("created_at", { ascending: false });
  if (filter?.partyId != null) query = query.eq("party_id", filter.partyId);
  if (filter?.invoiceId != null) query = query.eq("invoice_id", filter.invoiceId);
  if (filter?.purchaseId != null) query = query.eq("purchase_id", filter.purchaseId);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as PaymentSelectRow[];

  const partyIds = Array.from(new Set(rows.map((r) => r.party_id).filter((id): id is number => id != null)));
  const partyNameById = new Map<number, string>();
  if (partyIds.length > 0) {
    const { data: partyRows, error: partyError } = await supabase.from("parties").select("id, name").in("id", partyIds);
    if (partyError) throw partyError;
    for (const p of partyRows ?? []) partyNameById.set(p.id, p.name);
  }

  return rows.map((r) => ({
    id: r.id,
    direction: r.direction === "out" ? "out" : "in",
    partyId: r.party_id ?? null,
    partyName: r.party_id != null ? partyNameById.get(r.party_id) ?? "" : "",
    invoiceId: r.invoice_id ?? null,
    purchaseId: r.purchase_id ?? null,
    amount: Number(r.amount),
    mode: (r.mode ?? "cash") as PaymentMode,
    reference: r.reference ?? "",
    createdAt: r.created_at,
  }));
}

/**
 * Voids a purchase: reverses stock for every line item and marks it
 * voided, atomically (see void_purchase in supabase/schema.sql). Requires
 * a reason.
 */
export async function voidPurchase(id: number, reason: string): Promise<SimpleResult> {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { ok: false, error: "A reason is required to void a purchase." };
  }

  if (isDemoMode()) {
    return voidDemoPurchase(id, cleanReason);
  }

  const { error } = await getClient().rpc("void_purchase", {
    p_purchase_id: id,
    p_reason: cleanReason,
  });

  if (error) {
    if (error.message.includes("purchase_not_found")) {
      return { ok: false, error: "Purchase not found." };
    }
    if (error.message.includes("already_voided")) {
      return { ok: false, error: "This purchase is already voided." };
    }
    throw error;
  }

  return { ok: true };
}

function toParty(row: {
  id: number;
  type: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  created_at: string;
}): Party {
  return {
    id: row.id,
    type: row.type === "vendor" ? "vendor" : "customer",
    name: row.name,
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    gstin: row.gstin ?? "",
    createdAt: row.created_at,
  };
}

/**
 * Every saved party of the given type. Customers get an invoice
 * count/billed/paid/outstanding (what they owe us, from `invoices`);
 * vendors get the same shape computed from `purchases` instead (what we
 * owe them) — the two tables share column names for exactly this reason.
 * Small-business scale (at most low thousands of rows), so aggregating
 * client-side after two plain selects is simpler and just as fast as a
 * dedicated SQL view.
 */
export async function getParties(type: "customer" | "vendor" = "customer"): Promise<PartyWithBalance[]> {
  if (isDemoMode()) {
    return getDemoPartiesWithBalance(type);
  }

  const supabase = getClient();
  const txTable = type === "vendor" ? "purchases" : "invoices";
  const [partiesRes, txRes] = await Promise.all([
    supabase
      .from("parties")
      .select("id, type, name, address, phone, email, gstin, created_at")
      .eq("type", type),
    supabase.from(txTable).select("party_id, total, amount_paid").eq("status", "active"),
  ]);

  if (partiesRes.error) throw partiesRes.error;
  if (txRes.error) throw txRes.error;

  const byParty = new Map<number, { count: number; billed: number; paid: number }>();
  for (const tx of txRes.data ?? []) {
    if (tx.party_id == null) continue;
    const bucket = byParty.get(tx.party_id) ?? { count: 0, billed: 0, paid: 0 };
    bucket.count += 1;
    bucket.billed += Number(tx.total);
    bucket.paid += Number(tx.amount_paid ?? 0);
    byParty.set(tx.party_id, bucket);
  }

  return (partiesRes.data ?? [])
    .map((row) => {
      const party = toParty(row);
      const bucket = byParty.get(party.id) ?? { count: 0, billed: 0, paid: 0 };
      return {
        ...party,
        invoiceCount: bucket.count,
        totalBilled: bucket.billed,
        totalPaid: bucket.paid,
        outstanding: bucket.billed - bucket.paid,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Adds a new party. Blocks an exact case-insensitive name duplicate within the same type. */
export async function createParty(
  input: PartyInput,
  type: "customer" | "vendor" = "customer"
): Promise<PartyResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  if (isDemoMode()) {
    return createDemoParty(input, type);
  }

  const supabase = getClient();
  const { data: existing, error: findError } = await supabase
    .from("parties")
    .select("id")
    .eq("type", type)
    .ilike("name", name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    return { ok: false, error: `A party named "${name}" already exists.` };
  }

  const { data, error } = await supabase
    .from("parties")
    .insert({
      type,
      name,
      address: (input.address ?? "").trim(),
      phone: (input.phone ?? "").trim(),
      email: (input.email ?? "").trim(),
      gstin: (input.gstin ?? "").trim(),
    })
    .select("id, type, name, address, phone, email, gstin, created_at")
    .single();

  if (error) throw error;
  return { ok: true, party: toParty(data) };
}

/** Updates a party's saved details — does not touch any invoice/purchase already on record. */
export async function updateParty(id: number, input: PartyInput): Promise<PartyResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  if (isDemoMode()) {
    return updateDemoParty(id, input);
  }

  const { data, error } = await getClient()
    .from("parties")
    .update({
      name,
      address: (input.address ?? "").trim(),
      phone: (input.phone ?? "").trim(),
      email: (input.email ?? "").trim(),
      gstin: (input.gstin ?? "").trim(),
    })
    .eq("id", id)
    .select("id, type, name, address, phone, email, gstin, created_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Party not found." };
  return { ok: true, party: toParty(data) };
}

/**
 * A party's own saved details plus their full transaction history, newest
 * first — every invoice ever billed to them if they're a customer, or
 * every purchase ever recorded against them if they're a vendor (the other
 * list always comes back empty).
 */
export async function getPartyLedger(
  id: number
): Promise<{ party: Party; invoices: InvoiceSummary[]; purchases: PurchaseSummary[]; payments: PaymentRecord[] } | null> {
  if (isDemoMode()) {
    return getDemoPartyLedger(id);
  }

  const supabase = getClient();
  const { data: partyRow, error: partyError } = await supabase
    .from("parties")
    .select("id, type, name, address, phone, email, gstin, created_at")
    .eq("id", id)
    .maybeSingle();

  if (partyError) throw partyError;
  if (!partyRow) return null;

  const party = toParty(partyRow);
  const payments = await getPayments({ partyId: id });

  if (party.type === "vendor") {
    const { data, error } = await supabase
      .from("purchases")
      .select(PURCHASE_SUMMARY_SELECT)
      .eq("party_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { party, invoices: [], purchases: (data ?? []).map(toPurchaseSummary), payments };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SUMMARY_SELECT)
    .eq("party_id", id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { party, invoices: (data ?? []).map(toInvoiceSummary), purchases: [], payments };
}

/** Recent manual stock corrections, newest first — for the Stock Entry audit log. */
export async function getStockAdjustments(): Promise<StockAdjustmentRecord[]> {
  if (isDemoMode()) {
    return getDemoStockAdjustments();
  }

  const { data, error } = await getClient()
    .from("stock_adjustments")
    .select("id, product_name, qty, remarks, new_stock, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    productName: r.product_name,
    qty: r.qty,
    remarks: r.remarks,
    newStock: r.new_stock,
    createdAt: r.created_at,
  }));
}

/** Sales/GST summary for invoices created within [fromISO, toISO]. Excludes voided invoices. */
export async function getReportSummary(fromISO: string, toISO: string): Promise<ReportSummary> {
  if (isDemoMode()) {
    return getDemoReportSummary(fromISO, toISO);
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "party_id, subtotal, gst_amount, total, amount_paid, invoice_items(hsn_code, gst_rate, qty, subtotal, gst_amount, total)"
    )
    .eq("status", "active")
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  if (error) throw error;

  const rows = data ?? [];

  // B2B vs B2C (GSTR-1 Tables 4 and 7) hinges on whether the billed party
  // has a GSTIN on file — a second query for just the parties this range
  // actually touched, same two-query-then-merge pattern getParties() uses.
  const partyIds = Array.from(new Set(rows.map((r) => r.party_id).filter((id): id is number => id != null)));
  const gstinByParty = new Map<number, string>();
  if (partyIds.length > 0) {
    const { data: partyRows, error: partyError } = await supabase.from("parties").select("id, gstin").in("id", partyIds);
    if (partyError) throw partyError;
    for (const p of partyRows ?? []) gstinByParty.set(p.id, p.gstin ?? "");
  }

  const byRate = new Map<number, GstRateBreakdown>();
  const byHsn = new Map<string, HsnBreakdown>();
  let subtotal = 0;
  let gstAmount = 0;
  let total = 0;
  let amountPaid = 0;
  const b2b: SupplyCategoryTotals = { invoiceCount: 0, subtotal: 0, gstAmount: 0, total: 0 };
  const b2c: SupplyCategoryTotals = { invoiceCount: 0, subtotal: 0, gstAmount: 0, total: 0 };

  type ItemRow = { hsn_code: string | null; gst_rate: unknown; qty: number; subtotal: unknown; gst_amount: unknown; total: unknown };

  for (const inv of rows) {
    const invSubtotal = Number(inv.subtotal);
    const invGst = Number(inv.gst_amount);
    const invTotal = Number(inv.total);
    subtotal += invSubtotal;
    gstAmount += invGst;
    total += invTotal;
    amountPaid += Number(inv.amount_paid ?? 0);

    const hasGstin = inv.party_id != null && (gstinByParty.get(inv.party_id) || "").trim() !== "";
    const bucket2 = hasGstin ? b2b : b2c;
    bucket2.invoiceCount += 1;
    bucket2.subtotal += invSubtotal;
    bucket2.gstAmount += invGst;
    bucket2.total += invTotal;

    for (const item of (inv.invoice_items ?? []) as ItemRow[]) {
      const rate = Number(item.gst_rate);
      const bucket = byRate.get(rate) ?? { gstRate: rate, subtotal: 0, gstAmount: 0, total: 0 };
      bucket.subtotal += Number(item.subtotal);
      bucket.gstAmount += Number(item.gst_amount);
      bucket.total += Number(item.total);
      byRate.set(rate, bucket);

      const hsnCode = item.hsn_code || "—";
      const hsnKey = `${hsnCode}|${rate}`;
      const hsnBucket = byHsn.get(hsnKey) ?? { hsnCode, gstRate: rate, qty: 0, subtotal: 0, gstAmount: 0, total: 0 };
      hsnBucket.qty += item.qty;
      hsnBucket.subtotal += Number(item.subtotal);
      hsnBucket.gstAmount += Number(item.gst_amount);
      hsnBucket.total += Number(item.total);
      byHsn.set(hsnKey, hsnBucket);
    }
  }

  return {
    invoiceCount: rows.length,
    subtotal,
    gstAmount,
    total,
    amountPaid,
    amountOutstanding: total - amountPaid,
    byGstRate: Array.from(byRate.values()).sort((a, b) => a.gstRate - b.gstRate),
    byHsn: Array.from(byHsn.values()).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode)),
    b2b,
    b2c,
  };
}

export async function getSettings(): Promise<Settings> {
  if (isDemoMode()) {
    return { ...demoSettings };
  }

  const { data, error } = await getClient()
    .from("company_settings")
    .select("company_name, address, phone, email, gstin, currency_symbol, invoice_note, logo_data_url, invoice_prefix")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...DEFAULT_SETTINGS };

  return {
    companyName: data.company_name ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    gstin: data.gstin ?? "",
    currencySymbol: data.currency_symbol ?? "",
    invoiceNote: data.invoice_note ?? "",
    logoDataUrl: data.logo_data_url ?? "",
    invoicePrefix: data.invoice_prefix || "INV",
  };
}

export async function saveSettings(settings: Settings): Promise<{ ok: true } | { ok: false; error: string }> {
  if (settings.logoDataUrl && settings.logoDataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    return { ok: false, error: "Logo image is too large. Please use a smaller image (under ~500KB)." };
  }

  if (isDemoMode()) {
    demoSettings = { ...settings };
    return { ok: true };
  }

  const { error } = await getClient()
    .from("company_settings")
    .upsert({
      id: 1,
      company_name: settings.companyName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      gstin: settings.gstin,
      currency_symbol: settings.currencySymbol,
      logo_data_url: settings.logoDataUrl || null,
      invoice_note: settings.invoiceNote,
      invoice_prefix: settings.invoicePrefix || "INV",
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return { ok: true };
}
