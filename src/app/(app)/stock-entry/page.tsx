"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProductAvatar from "@/components/ProductAvatar";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number };
type Message = { type: "ok" | "error"; text: string };
type Adjustment = {
  id: number;
  productName: string;
  qty: number;
  remarks: string;
  newStock: number;
  createdAt: string;
};

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

  // Remove stock (physical count correction) form
  const [removeProduct, setRemoveProduct] = useState("");
  const [removeQty, setRemoveQty] = useState(1);
  const [removeRemarks, setRemoveRemarks] = useState("");
  const [removeMessage, setRemoveMessage] = useState<Message | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  // Edit product form (cost + GST rate)
  const [editProduct, setEditProduct] = useState("");
  const [editCost, setEditCost] = useState<number | "">("");
  const [editGstRate, setEditGstRate] = useState(GST_RATES[1]);
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState<number | "">("");
  const [newStock, setNewStock] = useState<number | "">("");
  const [newGstRate, setNewGstRate] = useState(GST_RATES[1]);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [newSubmitting, setNewSubmitting] = useState(false);

  // Recent stock adjustment history
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true);

  async function loadAdjustments() {
    setAdjustmentsLoading(true);
    try {
      const res = await fetch("/api/stock-adjustments");
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments || []);
      }
    } finally {
      setAdjustmentsLoading(false);
    }
  }

  useEffect(() => {
    loadAdjustments();
  }, []);

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
      setRemoveProduct((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
      setEditProduct((prev) => (prev && list.some((p) => p.name === prev) ? prev : list[0]?.name ?? ""));
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
    const product = products.find((p) => p.name === editProduct);
    if (product) {
      setEditCost(product.cost);
      setEditGstRate(product.gstRate);
    }
  }, [editProduct, products]);

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

  async function handleRemoveStock(e: FormEvent) {
    e.preventDefault();
    setRemoveMessage(null);
    setRemoveSubmitting(true);
    try {
      const res = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: removeProduct, qty: removeQty, remarks: removeRemarks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRemoveMessage({ type: "error", text: data.error || "Failed to remove stock." });
        return;
      }
      setRemoveMessage({
        type: "ok",
        text: `${removeQty} removed from ${data.product.name}. New stock: ${data.product.stock}.`,
      });
      setRemoveQty(1);
      setRemoveRemarks("");
      await Promise.all([loadProducts(), loadAdjustments()]);
    } finally {
      setRemoveSubmitting(false);
    }
  }

  async function handleEditProduct(e: FormEvent) {
    e.preventDefault();
    setEditMessage(null);
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editProduct, cost: editCost, gstRate: editGstRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditMessage({ type: "error", text: data.error || "Failed to update the product." });
        return;
      }
      setEditMessage({
        type: "ok",
        text: `${data.product.name} updated: cost ${data.product.cost}, GST ${data.product.gstRate}%.`,
      });
      await loadProducts();
    } finally {
      setEditSubmitting(false);
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
  const removeCurrent = products.find((p) => p.name === removeProduct);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Inventory</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Stock Entry</h1>
        <p className="mt-1 text-sm text-stone-500">
          Add or remove stock, edit a product&apos;s price/GST rate, or register a new product.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-md">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">➕ Add stock</h2>
            {products.length === 0 ? (
              <p className="text-sm text-stone-500">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleRestock} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="restock-product">
                    Product
                  </label>
                  <select
                    id="restock-product"
                    value={restockProduct}
                    onChange={(e) => setRestockProduct(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="restock-qty">
                    Quantity to add
                  </label>
                  <input
                    id="restock-qty"
                    type="number"
                    min={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                  {restockCurrent && (
                    <p className="mt-1 text-xs text-stone-500">
                      New stock will be {restockCurrent.stock + (restockQty > 0 ? restockQty : 0)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={restockSubmitting || !restockProduct || restockQty < 1}
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
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

          <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-md">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">➖ Remove stock</h2>
            <p className="mb-4 -mt-2 text-xs text-stone-500">
              For correcting a physical stock count mismatch — not a sale.
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-stone-500">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleRemoveStock} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="remove-product">
                    Product
                  </label>
                  <select
                    id="remove-product"
                    value={removeProduct}
                    onChange={(e) => setRemoveProduct(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="remove-qty">
                    Quantity to remove
                  </label>
                  <input
                    id="remove-qty"
                    type="number"
                    min={1}
                    max={removeCurrent?.stock || undefined}
                    value={removeQty}
                    onChange={(e) => setRemoveQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                  {removeCurrent && (
                    <p className="mt-1 text-xs text-stone-500">{removeCurrent.stock} currently in stock</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="remove-remarks">
                    Remarks <span className="text-stone-400">(required)</span>
                  </label>
                  <input
                    id="remove-remarks"
                    type="text"
                    value={removeRemarks}
                    onChange={(e) => setRemoveRemarks(e.target.value)}
                    placeholder="e.g. damaged in transit, recount correction"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    removeSubmitting ||
                    !removeProduct ||
                    removeQty < 1 ||
                    removeQty > (removeCurrent?.stock ?? 0) ||
                    !removeRemarks.trim()
                  }
                  className="rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  {removeSubmitting ? "Removing…" : "Remove stock"}
                </button>
              </form>
            )}

            {removeMessage && (
              <p
                className={`mt-4 text-sm ${
                  removeMessage.type === "ok" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {removeMessage.text}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-md">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">✏️ Edit product</h2>
            <p className="mb-4 -mt-2 text-xs text-stone-500">Update an existing product&apos;s price or GST rate.</p>
            {products.length === 0 ? (
              <p className="text-sm text-stone-500">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleEditProduct} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="edit-product">
                    Product
                  </label>
                  <select
                    id="edit-product"
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {p.cost} / {p.gstRate}%
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="edit-cost">
                      Cost
                    </label>
                    <input
                      id="edit-cost"
                      type="number"
                      min={0}
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="edit-gst">
                      GST rate
                    </label>
                    <select
                      id="edit-gst"
                      value={editGstRate}
                      onChange={(e) => setEditGstRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={editSubmitting || !editProduct || editCost === ""}
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
                >
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </form>
            )}

            {editMessage && (
              <p className={`mt-4 text-sm ${editMessage.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {editMessage.text}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-md lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">🆕 Add new product</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="new-name">
                  Product name
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="new-cost">
                  Cost
                </label>
                <input
                  id="new-cost"
                  type="number"
                  min={0}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="new-stock">
                  Initial stock
                </label>
                <input
                  id="new-stock"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="new-gst">
                  GST rate
                </label>
                <select
                  id="new-gst"
                  value={newGstRate}
                  onChange={(e) => setNewGstRate(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
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
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
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

      <section className="mt-6 rounded-2xl border border-stone-100 bg-white shadow-md">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">📋 Recent stock adjustments</h2>
          <p className="text-xs text-stone-500">Every manual stock correction, with its remarks.</p>
        </div>
        {adjustmentsLoading ? (
          <p className="px-5 py-6 text-sm text-stone-500">Loading…</p>
        ) : adjustments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-stone-500">No stock corrections logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                  <th className="whitespace-nowrap px-5 py-3">Date</th>
                  <th className="whitespace-nowrap px-5 py-3">Product</th>
                  <th className="whitespace-nowrap px-5 py-3">Qty removed</th>
                  <th className="whitespace-nowrap px-5 py-3">New stock</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id} className="border-b border-stone-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-stone-600">
                      {new Date(a.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-2 font-medium text-stone-900">
                        <ProductAvatar name={a.productName} />
                        {a.productName}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-red-600">-{a.qty}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-stone-600">{a.newStock}</td>
                    <td className="px-5 py-3 text-stone-600">{a.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
