"use client";

import { useEffect, useState, type FormEvent } from "react";

type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currencySymbol: string;
  invoiceNote: string;
};

const EMPTY: Settings = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  currencySymbol: "",
  invoiceNote: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/settings");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error || "Failed to load settings.");
          return;
        }
        setSettings(data.settings);
      } catch {
        setLoadError("Failed to reach the server.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
        return;
      }
      setMessage({ type: "ok", text: "Settings saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Company details shown on printed invoices.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <Field label="Company name">
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>

          <Field label="Address">
            <textarea
              value={settings.address}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={settings.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GSTIN / Tax ID" hint="Leave blank if not applicable">
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => update("gstin", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Currency symbol" hint="e.g. ₹, $, Rs.">
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => update("currencySymbol", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </Field>
          </div>

          <Field label="Invoice footer note">
            <input
              type="text"
              value={settings.invoiceNote}
              onChange={(e) => update("invoiceNote", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 self-start rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
