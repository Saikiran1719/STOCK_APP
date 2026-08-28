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
  invoicePrefix: string;
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
  invoicePrefix: "INV",
};

function currentFyLabel() {
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // April = month 3
  return `${String(fyStart % 100).padStart(2, "0")}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

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
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Configuration</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Company details shown on printed invoices.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-err">{loadError}</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
        >
          <Field label="Logo" hint="Shown in the sidebar and on invoices. Under 500KB.">
            <div className="flex items-center gap-4">
              {settings.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoDataUrl}
                  alt="Company logo preview"
                  className="h-14 w-14 rounded-lg border border-border object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="w-fit cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-stripe">
                  Choose image
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                {settings.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => update("logoDataUrl", "")}
                    className="w-fit text-xs text-err hover:underline"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
            {logoError && <p className="mt-1 text-xs text-err">{logoError}</p>}
          </Field>

          <Field label="Company name">
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>

          <Field label="Address">
            <textarea
              value={settings.address}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={settings.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GSTIN / Tax ID" hint="Leave blank if not applicable">
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => update("gstin", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </Field>
            <Field label="Currency symbol" hint="e.g. ₹, $, Rs.">
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => update("currencySymbol", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </Field>
          </div>

          <Field label="Invoice footer note">
            <input
              type="text"
              value={settings.invoiceNote}
              onChange={(e) => update("invoiceNote", e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>

          <Field
            label="Invoice number prefix"
            hint={`New invoices this financial year look like ${settings.invoicePrefix || "INV"}/${currentFyLabel()}/00001, numbered consecutively — only affects new invoices, existing ones never renumber`}
          >
            <input
              type="text"
              value={settings.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value)}
              placeholder="INV"
              className="w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-ok" : "text-err"}`}>
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
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
