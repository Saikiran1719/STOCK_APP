"use client";

import { useEffect, useState, type FormEvent } from "react";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Message = { type: "ok" | "error"; text: string };

const GST_RATES = [5, 18];

export default function StockEntryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Add stock form
  const [restockProduct, setRestockProduct] = useState("");
  const [restockQty, setRestockQty] = useState(1);
  const [restockMessage, setRestockMessage] = useState<Message | null>(null);
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // GST rate form
  const [gstProduct, setGstProduct] = useState("");
  const [gstRate, setGstRate] = useState(GST_RATES[1]);
  const [gstMessage, setGstMessage] = useState<Message | null>(null);
  const [gstSubmitting, setGstSubmitting] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState<number | "">("");
  const [newStock, setNewStock] = useState<number | "">("");
  const [newGstRate, setNewGstRate] = useState(GST_RATES[1]);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [newSubmitting, setNewSubmitting] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/products");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Failed to load products.");
        setProducts([]);
        return;
      }
      const list: Product[] = data.products || [];
      setProducts(list);
      setRestockProduct((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
      setGstProduct((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
    } catch {
      setLoadError("Failed to reach the server.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const product = products.find((p) => p.name === gstProduct);
    if (product) setGstRate(product.gstRate);
  }, [gstProduct, products]);

  async function handleRestock(e: FormEvent) {
    e.preventDefault();
    setRestockMessage(null);
    setRestockSubmitting(true);
    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: restockProduct, qty: restockQty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRestockMessage({ type: "error", text: data.error || "Failed to add stock." });
        return;
      }
      setRestockMessage({
        type: "ok",
        text: `${restockQty} added to ${data.product.name}. New stock: ${data.product.stock}.`,
      });
      setRestockQty(1);
      await loadProducts();
    } finally {
      setRestockSubmitting(false);
    }
  }

  async function handleGstUpdate(e: FormEvent) {
    e.preventDefault();
    setGstMessage(null);
    setGstSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: gstProduct, gstRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGstMessage({ type: "error", text: data.error || "Failed to update GST rate." });
        return;
      }
      setGstMessage({ type: "ok", text: `${data.product.name} is now taxed at ${data.product.gstRate}% GST.` });
      await loadProducts();
    } finally {
      setGstSubmitting(false);
    }
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    setNewMessage(null);
    setNewSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, cost: newCost, stock: newStock, gstRate: newGstRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewMessage({ type: "error", text: data.error || "Failed to add product." });
        return;
      }
      setNewMessage({ type: "ok", text: `Product "${data.product.name}" added.` });
      setNewName("");
      setNewCost("");
      setNewStock("");
      setNewGstRate(GST_RATES[1]);
      await loadProducts();
    } finally {
      setNewSubmitting(false);
    }
  }

  const restockCurrent = products.find((p) => p.name === restockProduct);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Stock Entry</h1>
        <p className="text-sm text-slate-500">Add stock, set GST rates, or register a new product.</p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Add stock</h2>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleRestock} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="restock-product">
                    Product
                  </label>
                  <select
                    id="restock-product"
                    value={restockProduct}
                    onChange={(e) => setRestockProduct(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="restock-qty">
                    Quantity to add
                  </label>
                  <input
                    id="restock-qty"
                    type="number"
                    min={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  {restockCurrent && (
                    <p className="mt-1 text-xs text-slate-500">
                      New stock will be {restockCurrent.stock + (restockQty > 0 ? restockQty : 0)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={restockSubmitting || !restockProduct || restockQty < 1}
                  className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {restockSubmitting ? "Adding…" : "Add stock"}
                </button>
              </form>
            )}

            {restockMessage && (
              <p
                className={`mt-4 text-sm ${
                  restockMessage.type === "ok" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {restockMessage.text}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Update GST rate</h2>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleGstUpdate} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="gst-product">
                    Product
                  </label>
                  <select
                    id="gst-product"
                    value={gstProduct}
                    onChange={(e) => setGstProduct(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.gstRate}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="gst-rate">
                    GST rate
                  </label>
                  <select
                    id="gst-rate"
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {GST_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={gstSubmitting || !gstProduct}
                  className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {gstSubmitting ? "Saving…" : "Update GST rate"}
                </button>
              </form>
            )}

            {gstMessage && (
              <p className={`mt-4 text-sm ${gstMessage.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {gstMessage.text}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Add new product</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="new-name">
                  Product name
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="new-cost">
                  Cost
                </label>
                <input
                  id="new-cost"
                  type="number"
                  min={0}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="new-stock">
                  Initial stock
                </label>
                <input
                  id="new-stock"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="new-gst">
                  GST rate
                </label>
                <select
                  id="new-gst"
                  value={newGstRate}
                  onChange={(e) => setNewGstRate(Number(e.target.value))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={newSubmitting || !newName.trim() || newCost === "" || newStock === ""}
                  className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {newSubmitting ? "Adding…" : "Add product"}
                </button>
              </div>
            </form>

            {newMessage && (
              <p
                className={`mt-4 text-sm ${
                  newMessage.type === "ok" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {newMessage.text}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
