"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProductAvatar from "@/components/ProductAvatar";
import { Th, Td, TABLE_HEAD_ROW } from "@/components/DataTable";

type Product = { id: number; name: string; cost: number; stock: number; gstRate: number; hsnCode: string };
type Message = { type: "ok" | "error"; text: string };
type Adjustment = {
  id: number;
  productName: string;
  qty: number;
  remarks: string;
  newStock: number;
  createdAt: string;
};

const GST_RATES = [0, 5, 12, 18, 28];

type SectionKey = "add" | "remove" | "edit" | "new";

export default function StockEntryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Which action card is expanded — only one at a time, to keep the page short.
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  function toggleSection(key: SectionKey) {
    setOpenSection((prev) => (prev === key ? null : key));
  }

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

  // Edit product form (cost + GST rate + HSN/SAC)
  const [editProduct, setEditProduct] = useState("");
  const [editCost, setEditCost] = useState<number | "">("");
  const [editGstRate, setEditGstRate] = useState(18);
  const [editHsnCode, setEditHsnCode] = useState("");
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState<number | "">("");
  const [newStock, setNewStock] = useState<number | "">("");
  const [newGstRate, setNewGstRate] = useState(18);
  const [newHsnCode, setNewHsnCode] = useState("");
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
      setEditHsnCode(product.hsnCode);
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
        body: JSON.stringify({ name: editProduct, cost: editCost, gstRate: editGstRate, hsnCode: editHsnCode }),
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
        body: JSON.stringify({ name: newName, cost: newCost, stock: newStock, gstRate: newGstRate, hsnCode: newHsnCode }),
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
      setNewGstRate(18);
      setNewHsnCode("");
      await loadProducts();
    } finally {
      setNewSubmitting(false);
    }
  }

  const restockCurrent = products.find((p) => p.name === restockProduct);
  const removeCurrent = products.find((p) => p.name === removeProduct);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Inventory</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Stock Entry</h1>
        <p className="mt-1 text-sm text-muted">
          Add or remove stock, edit a product&apos;s price/GST rate, or register a new product. Tap
          a card to open it.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <AccordionCard
            icon="➕"
            title="Add stock"
            isOpen={openSection === "add"}
            onToggle={() => toggleSection("add")}
          >
            {products.length === 0 ? (
              <p className="text-sm text-muted">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleRestock} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="restock-product">
                    Product
                  </label>
                  <select
                    id="restock-product"
                    value={restockProduct}
                    onChange={(e) => setRestockProduct(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="restock-qty">
                    Quantity to add
                  </label>
                  <input
                    id="restock-qty"
                    type="number"
                    min={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  {restockCurrent && (
                    <p className="mt-1 text-xs text-muted">
                      New stock will be {restockCurrent.stock + (restockQty > 0 ? restockQty : 0)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={restockSubmitting || !restockProduct || restockQty < 1}
                  className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
                >
                  {restockSubmitting ? "Adding…" : "Add stock"}
                </button>
              </form>
            )}

            {restockMessage && (
              <p className={`mt-4 text-sm ${restockMessage.type === "ok" ? "text-ok" : "text-err"}`}>
                {restockMessage.text}
              </p>
            )}
          </AccordionCard>

          <AccordionCard
            icon="➖"
            title="Remove stock"
            subtitle="For correcting a physical stock count mismatch — not a sale."
            isOpen={openSection === "remove"}
            onToggle={() => toggleSection("remove")}
          >
            {products.length === 0 ? (
              <p className="text-sm text-muted">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleRemoveStock} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="remove-product">
                    Product
                  </label>
                  <select
                    id="remove-product"
                    value={removeProduct}
                    onChange={(e) => setRemoveProduct(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — currently {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="remove-qty">
                    Quantity to remove
                  </label>
                  <input
                    id="remove-qty"
                    type="number"
                    min={1}
                    max={removeCurrent?.stock || undefined}
                    value={removeQty}
                    onChange={(e) => setRemoveQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  {removeCurrent && (
                    <p className="mt-1 text-xs text-muted">{removeCurrent.stock} currently in stock</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="remove-remarks">
                    Remarks <span className="text-muted">(required)</span>
                  </label>
                  <input
                    id="remove-remarks"
                    type="text"
                    value={removeRemarks}
                    onChange={(e) => setRemoveRemarks(e.target.value)}
                    placeholder="e.g. damaged in transit, recount correction"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                  className="rounded-lg bg-err px-3 py-2 text-sm font-medium text-white transition hover:bg-err/85 disabled:opacity-50"
                >
                  {removeSubmitting ? "Removing…" : "Remove stock"}
                </button>
              </form>
            )}

            {removeMessage && (
              <p className={`mt-4 text-sm ${removeMessage.type === "ok" ? "text-ok" : "text-err"}`}>
                {removeMessage.text}
              </p>
            )}
          </AccordionCard>

          <AccordionCard
            icon="✏️"
            title="Edit product"
            subtitle="Update an existing product's price or GST rate."
            isOpen={openSection === "edit"}
            onToggle={() => toggleSection("edit")}
          >
            {products.length === 0 ? (
              <p className="text-sm text-muted">No products yet — add one first.</p>
            ) : (
              <form onSubmit={handleEditProduct} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-product">
                    Product
                  </label>
                  <select
                    id="edit-product"
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                    <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-cost">
                      Cost
                    </label>
                    <input
                      id="edit-cost"
                      type="number"
                      min={0}
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-gst">
                      GST rate
                    </label>
                    <select
                      id="edit-gst"
                      value={editGstRate}
                      onChange={(e) => setEditGstRate(Number(e.target.value))}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-hsn">
                    HSN/SAC code <span className="text-muted">(optional)</span>
                  </label>
                  <input
                    id="edit-hsn"
                    type="text"
                    value={editHsnCode}
                    onChange={(e) => setEditHsnCode(e.target.value)}
                    placeholder="e.g. 8471"
                    className="w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={editSubmitting || !editProduct || editCost === ""}
                  className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
                >
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </form>
            )}

            {editMessage && (
              <p className={`mt-4 text-sm ${editMessage.type === "ok" ? "text-ok" : "text-err"}`}>
                {editMessage.text}
              </p>
            )}
          </AccordionCard>

          <AccordionCard
            icon="🆕"
            title="Add new product"
            isOpen={openSection === "new"}
            onToggle={() => toggleSection("new")}
          >
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-name">
                  Product name
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-cost">
                  Cost
                </label>
                <input
                  id="new-cost"
                  type="number"
                  min={0}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-stock">
                  Initial stock
                </label>
                <input
                  id="new-stock"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-gst">
                  GST rate
                </label>
                <select
                  id="new-gst"
                  value={newGstRate}
                  onChange={(e) => setNewGstRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="new-hsn">
                  HSN/SAC code <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="new-hsn"
                  type="text"
                  value={newHsnCode}
                  onChange={(e) => setNewHsnCode(e.target.value)}
                  placeholder="e.g. 8471"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={newSubmitting || !newName.trim() || newCost === "" || newStock === ""}
                  className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
                >
                  {newSubmitting ? "Adding…" : "Add product"}
                </button>
              </div>
            </form>

            {newMessage && (
              <p className={`mt-4 text-sm ${newMessage.type === "ok" ? "text-ok" : "text-err"}`}>
                {newMessage.text}
              </p>
            )}
          </AccordionCard>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">📋 Recent stock adjustments</h2>
          <p className="text-xs text-muted">Every manual stock correction, with its remarks.</p>
        </div>
        {adjustmentsLoading ? (
          <p className="px-5 py-6 text-sm text-muted">Loading…</p>
        ) : adjustments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No stock corrections logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <Th>Date</Th>
                  <Th>Product</Th>
                  <Th>Qty removed</Th>
                  <Th>New stock</Th>
                  <Th>Remarks</Th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a, i) => (
                  <tr key={a.id} className={`${i % 2 === 1 ? "bg-stripe" : ""} hover:bg-accent-soft`}>
                    <Td className="text-muted">
                      {new Date(a.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <ProductAvatar name={a.productName} />
                        {a.productName}
                      </div>
                    </Td>
                    <Td className="text-err">-{a.qty}</Td>
                    <Td className="text-muted">{a.newStock}</Td>
                    <Td className="text-muted">{a.remarks}</Td>
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

function AccordionCard({
  icon,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-base" aria-hidden>
            {icon}
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">{title}</span>
            {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
          </span>
        </span>
        <span
          className={`shrink-0 text-muted transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {isOpen && <div className="border-t border-border px-5 py-5">{children}</div>}
    </section>
  );
}
