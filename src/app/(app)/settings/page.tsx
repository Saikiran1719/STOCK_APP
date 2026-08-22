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
  logoDataUrl: string;
};

const EMPTY: Settings = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  currencySymbol: "",
  invoiceNote: "",
  logoDataUrl: "",
};

const MAX_LOGO_FILE_BYTES = 500 * 1024; // 500KB

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

  const [logoError, setLogoError] = useState("");

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setLogoError("Image is too large — please use one under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update("logoDataUrl", String(reader.result || ""));
    reader.onerror = () => setLogoError("Failed to read that file.");
    reader.readAsDataURL(file);
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
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Configuration</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Company details shown on printed invoices.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-stone-100 bg-white p-4 shadow-md sm:p-6"
        >
          <Field label="Logo" hint="Shown in the sidebar and on invoices. Under 500KB.">
            <div className="flex items-center gap-4">
              {settings.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoDataUrl}
                  alt="Company logo preview"
                  className="h-14 w-14 rounded-xl border border-stone-200 object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-stone-300 text-xs text-stone-400">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="w-fit cursor-pointer rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
                  Choose image
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                {settings.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => update("logoDataUrl", "")}
                    className="w-fit text-xs text-red-600 hover:underline"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
            {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
          </Field>

          <Field label="Company name">
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </Field>

          <Field label="Address">
            <textarea
              value={settings.address}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={settings.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GSTIN / Tax ID" hint="Leave blank if not applicable">
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => update("gstin", e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </Field>
            <Field label="Currency symbol" hint="e.g. ₹, $, Rs.">
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => update("currencySymbol", e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </Field>
          </div>

          <Field label="Invoice footer note">
            <input
              type="text"
              value={settings.invoiceNote}
              onChange={(e) => update("invoiceNote", e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 self-start rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30 disabled:opacity-50 disabled:shadow-none"
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
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}
