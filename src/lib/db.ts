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

export type OrderRecord = {
  id: number;
  productName: string;
  qty: number;
  unitCost: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  newStock: number;
  customerName: string | null;
  createdAt: string;
};

export type OrderResult =
  | { ok: true; orderId: number | null; product: string; qty: number; newStock: number }
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
let demoOrders: OrderRecord[] = [];
let demoNextProductId = 4;
let demoNextOrderId = 1;
let demoSettings: Settings = { ...DEFAULT_SETTINGS };

function getDemoProducts(): Product[] {
  return demoProducts.map((p) => ({ ...p }));
}

function placeDemoOrder(
  productName: string,
  qty: number,
  customerName: string | null
): OrderResult {
  const product = demoProducts.find(
    (p) => p.name.toLowerCase() === productName.toLowerCase()
  );
  if (!product) {
    return { ok: false, error: `Product "${productName}" was not found.` };
  }
  if (qty > product.stock) {
    return { ok: false, error: `Only ${product.stock} of ${product.name} in stock.` };
  }
  product.stock -= qty;
  const subtotal = product.cost * qty;
  const gstAmount = (subtotal * product.gstRate) / 100;
  const order: OrderRecord = {
    id: demoNextOrderId++,
    productName: product.name,
    qty,
    unitCost: product.cost,
    subtotal,
    gstRate: product.gstRate,
    gstAmount,
    total: subtotal + gstAmount,
    newStock: product.stock,
    customerName: customerName || null,
    createdAt: new Date().toISOString(),
  };
  demoOrders.push(order);
  return { ok: true, orderId: order.id, product: product.name, qty, newStock: product.stock };
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
 * Reduces stock for a product by qty. The Supabase path uses a single
 * atomic SQL statement (see decrement_stock in supabase/schema.sql) so
 * concurrent orders for the same product can never oversell it. GST is
 * applied using the product's rate at the moment of sale and frozen onto
 * the order, same as unit cost.
 */
export async function placeOrder(
  productName: string,
  qty: number,
  customerName?: string
): Promise<OrderResult> {
  if (!productName || !Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: "Choose a product and a valid quantity." };
  }

  const cleanCustomerName = customerName?.trim() || null;

  if (isDemoMode()) {
    return placeDemoOrder(productName, qty, cleanCustomerName);
  }

  const supabase = getClient();

  const { data, error } = await supabase.rpc("decrement_stock", {
    p_name: productName,
    p_qty: qty,
  });
  if (error) throw error;

  const row = (data as Parameters<typeof toProduct>[0][] | null)?.[0];

  if (!row) {
    // The atomic update matched nothing — figure out why, just for a clear
    // message. This read is not relied on for correctness.
    const { data: existing } = await supabase
      .from("products")
      .select("stock")
      .eq("name", productName)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: `Product "${productName}" was not found.` };
    }
    return { ok: false, error: `Only ${existing.stock} of ${productName} in stock.` };
  }

  const unitCost = Number(row.cost);
  const gstRate = Number(row.gst_rate);
  const subtotal = unitCost * qty;
  const gstAmount = (subtotal * gstRate) / 100;
  const total = subtotal + gstAmount;

  // The order row doubles as the invoice record. A failure here shouldn't
  // undo the stock reduction (that's the operation that actually matters),
  // but without an id there's no invoice to show — the caller handles that.
  const { data: orderRow, error: logError } = await supabase
    .from("orders")
    .insert({
      product_id: row.id,
      product_name: row.name,
      qty,
      new_stock: row.stock,
      unit_cost: unitCost,
      gst_rate: gstRate,
      subtotal,
      gst_amount: gstAmount,
      total,
      customer_name: cleanCustomerName,
    })
    .select("id")
    .single();

  if (logError || !orderRow) {
    console.error("Failed to write order log:", logError);
    return { ok: true, orderId: null, product: row.name, qty, newStock: row.stock };
  }

  return { ok: true, orderId: orderRow.id, product: row.name, qty, newStock: row.stock };
}

export async function getOrderById(id: number): Promise<OrderRecord | null> {
  if (isDemoMode()) {
    return demoOrders.find((o) => o.id === id) ?? null;
  }

  const { data, error } = await getClient()
    .from("orders")
    .select(
      "id, product_name, qty, unit_cost, subtotal, gst_rate, gst_amount, total, new_stock, customer_name, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    productName: data.product_name,
    qty: data.qty,
    unitCost: Number(data.unit_cost ?? 0),
    subtotal: Number(data.subtotal ?? 0),
    gstRate: Number(data.gst_rate ?? 0),
    gstAmount: Number(data.gst_amount ?? 0),
    total: Number(data.total ?? 0),
    newStock: data.new_stock,
    customerName: data.customer_name,
    createdAt: data.created_at,
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
