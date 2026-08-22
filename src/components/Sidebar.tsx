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
      <div className="flex items-center justify-between border-b border-[#123028] bg-[#0e2622] px-4 py-3 text-white lg:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-xl p-1 text-xl leading-none hover:bg-white/10"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <Brand companyName={companyName} logoDataUrl={logoDataUrl} compact />
          <p className="text-sm font-bold tracking-tight">CounterBook</p>
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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full transform flex-col bg-[#0e2622] text-stone-300 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 print:hidden ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400" />

        <div className="flex items-center justify-between border-b border-[#123028] px-5 py-5">
          <div className="flex items-center gap-3">
            <Brand companyName={companyName} logoDataUrl={logoDataUrl} />
            <div>
              <p className="text-base font-bold tracking-tight text-white">CounterBook</p>
              <p className="text-xs text-stone-400">{companyName || "Billing & stock console"}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-xl p-1 text-stone-400 hover:bg-white/10 hover:text-white lg:hidden"
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-950/40"
                    : "text-stone-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#123028] px-3 py-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-400 hover:bg-white/5 hover:text-white"
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
    return <img src={logoDataUrl} alt="Company logo" className={`${dims} shrink-0 rounded-xl object-contain`} />;
  }
  const initial = companyName.trim().charAt(0).toUpperCase() || "C";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 font-bold text-[#0e2622]`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
