"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/stock-entry", label: "Stock Entry", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setCompanyName(data.settings.companyName || "");
          setLogoDataUrl(data.settings.logoDataUrl || "");
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white lg:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded p-1 text-xl leading-none hover:bg-slate-800"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <Brand companyName={companyName} logoDataUrl={logoDataUrl} compact />
          <p className="text-sm font-semibold tracking-wide">STOCK WAREHOUSE</p>
        </div>
        <span className="w-7" aria-hidden />
      </div>

      {/* Backdrop for the mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full transform flex-col bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 print:hidden ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <Brand companyName={companyName} logoDataUrl={logoDataUrl} />
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">STOCK WAREHOUSE</p>
              <p className="text-xs text-slate-500">{companyName || "Inventory Console"}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-l-2 border-indigo-400 bg-indigo-500/15 text-white"
                    : "border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-3 py-4">
          <button
            onClick={handleLogout}
            className="w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800/60 hover:text-white"
          >
            ↩ Log out
          </button>
        </div>
      </aside>
    </>
  );
}

function Brand({
  companyName,
  logoDataUrl,
  compact = false,
}: {
  companyName: string;
  logoDataUrl: string;
  compact?: boolean;
}) {
  const dims = compact ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm";
  if (logoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoDataUrl} alt="Company logo" className={`${dims} shrink-0 rounded object-contain`} />;
  }
  const initial = companyName.trim().charAt(0).toUpperCase() || "S";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
