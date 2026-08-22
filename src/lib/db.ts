import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** The only GST slabs this app offers, per how the business actually prices items. */
export const GST_RATES = [5, 18] as const;

export type Product = {
  id: number;
  name: string;
  cost: number;
  stock: number;
  gstRate: number;
};

export type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currencySymbol: string;
  invoiceNote: string;
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
};

export type InvoiceSummary = {
  id: number;
  customerName: string | null;
  itemsLabel: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  createdAt: string;
};

export type InvoiceDetail = {
  id: number;
  customerName: string | null;
  subtotal: number;
  gstAmount: number;
  total: number;
  createdAt: string;
  items: InvoiceItem[];
};

export type PlaceInvoiceResult =
  | { ok: true; invoiceId: number; total: number }
  | { ok: false; error: string };

export type ProductResult = { ok: true; product: Product } | { ok: false; error: string };

const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  currencySymbol: "",
  invoiceNote: "Thank you for your business.",
};

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
  { id: 1, name: "MOUSE", cost: 500, stock: 100, gstRate: 18 },
  { id: 2, name: "KEYBOARD", cost: 1000, stock: 50, gstRate: 18 },
  { id: 3, name: "MONITER", cost: 5000, stock: 5, gstRate: 18 },
];
let demoInvoices: InvoiceDetail[] = [];
let demoNextProductId = 4;
let demoNextInvoiceId = 1;
let demoSettings: Settings = { ...DEFAULT_SETTINGS };

function getDemoProducts(): Product[] {
  return demoProducts.map((p) => ({ ...p }));
}

function placeDemoInvoice(
  items: InvoiceItemInput[],
  customerName: string | null
): PlaceInvoiceResult {
  if (items.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }

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
  let subtotal = 0;
  let gstAmount = 0;
  let total = 0;

  for (const { product, qty } of lines) {
    product.stock -= qty;
    const lineSubtotal = product.cost * qty;
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
    });
    subtotal += lineSubtotal;
    gstAmount += lineGst;
    total += lineTotal;
  }

  const invoice: InvoiceDetail = {
    id: demoNextInvoiceId++,
    customerName: customerName || null,
    subtotal,
    gstAmount,
    total,
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
      customerName: inv.customerName,
      itemsLabel: inv.items.map((it) => `${it.productName} x${it.qty}`).join(", "),
      subtotal: inv.subtotal,
      gstAmount: inv.gstAmount,
      total: inv.total,
      createdAt: inv.createdAt,
    }));
}

function getDemoInvoiceById(id: number): InvoiceDetail | null {
  const invoice = demoInvoices.find((inv) => inv.id === id);
  return invoice ? { ...invoice, items: invoice.items.map((it) => ({ ...it })) } : null;
}

function createDemoProduct(
  name: string,
  cost: number,
  stock: number,
  gstRate: number
): ProductResult {
  const exists = demoProducts.some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { ok: false, error: `Product "${name}" already exists.` };
  }
  const product: Product = { id: demoNextProductId++, name, cost, stock, gstRate };
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

function removeDemoStock(name: string, qty: number): ProductResult {
  const product = demoProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!product) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  if (qty > product.stock) {
    return { ok: false, error: `Only ${product.stock} of ${product.name} in stock.` };
  }
  product.stock -= qty;
  return { ok: true, product: { ...product } };
}

function updateDemoProductGst(name: string, gstRate: number): ProductResult {
  const product = demoProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!product) {
    return { ok: false, error: `Product "${name}" was not found.` };
  }
  product.gstRate = gstRate;
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
}): Product {
  return {
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    stock: row.stock,
    gstRate: Number(row.gst_rate),
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

  return "Failed to place the order. Please try again.";
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
    .select("id, name, cost, stock, gst_rate")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function createProduct(
  name: string,
  cost: number,
  stock: number,
  gstRate: number
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
    return createDemoProduct(name.trim(), cost, stock, gstRate);
  }

  const { data, error } = await getClient()
    .from("products")
    .insert({ name: name.trim(), cost, stock, gst_rate: gstRate })
    .select("id, name, cost, stock, gst_rate")
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
    return removeDemoStock(name, qty);
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

/** Sets a product's GST rate — used by the Stock Entry "Update GST rate" form. */
export async function updateProductGst(name: string, gstRate: number): Promise<ProductResult> {
  if (!isValidGstRate(gstRate)) {
    return { ok: false, error: `GST rate must be one of: ${GST_RATES.join("%, ")}%.` };
  }

  if (isDemoMode()) {
    return updateDemoProductGst(name, gstRate);
  }

  const { data, error } = await getClient()
    .from("products")
    .update({ gst_rate: gstRate })
    .eq("name", name)
    .select("id, name, cost, stock, gst_rate")
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
  customerName?: string
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

  const cleanCustomerName = customerName?.trim() || null;

  if (isDemoMode()) {
    return placeDemoInvoice(cleanItems, cleanCustomerName);
  }

  const { data, error } = await getClient().rpc("place_invoice", {
    p_customer_name: cleanCustomerName,
    p_items: cleanItems,
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

export async function getInvoices(): Promise<InvoiceSummary[]> {
  if (isDemoMode()) {
    return getDemoInvoices();
  }

  const { data, error } = await getClient()
    .from("invoices")
    .select("id, customer_name, subtotal, gst_amount, total, created_at, invoice_items(product_name, qty)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((inv) => ({
    id: inv.id,
    customerName: inv.customer_name,
    itemsLabel: ((inv.invoice_items ?? []) as { product_name: string; qty: number }[])
      .map((it) => `${it.product_name} x${it.qty}`)
      .join(", "),
    subtotal: Number(inv.subtotal),
    gstAmount: Number(inv.gst_amount),
    total: Number(inv.total),
    createdAt: inv.created_at,
  }));
}

export async function getInvoiceById(id: number): Promise<InvoiceDetail | null> {
  if (isDemoMode()) {
    return getDemoInvoiceById(id);
  }

  const { data, error } = await getClient()
    .from("invoices")
    .select(
      "id, customer_name, subtotal, gst_amount, total, created_at, invoice_items(product_name, qty, unit_cost, gst_rate, subtotal, gst_amount, total)"
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
  };

  return {
    id: data.id,
    customerName: data.customer_name,
    subtotal: Number(data.subtotal),
    gstAmount: Number(data.gst_amount),
    total: Number(data.total),
    createdAt: data.created_at,
    items: ((data.invoice_items ?? []) as ItemRow[]).map((it) => ({
      productName: it.product_name,
      qty: it.qty,
      unitCost: Number(it.unit_cost),
      gstRate: Number(it.gst_rate),
      subtotal: Number(it.subtotal),
      gstAmount: Number(it.gst_amount),
      total: Number(it.total),
    })),
  };
}

export async function getSettings(): Promise<Settings> {
  if (isDemoMode()) {
    return { ...demoSettings };
  }

  const { data, error } = await getClient()
    .from("company_settings")
    .select("company_name, address, phone, email, gstin, currency_symbol, invoice_note")
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
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (isDemoMode()) {
    demoSettings = { ...settings };
    return;
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
      invoice_note: settings.invoiceNote,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}
