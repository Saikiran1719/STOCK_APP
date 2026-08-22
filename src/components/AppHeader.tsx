"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/stock", label: "Stock", icon: "📦" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/stock-entry", label: "Stock Entry", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

// Exact match, or a real sub-route — "/stock" must not also light up on
// "/stock-entry" just because it's a string prefix.
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader() {
  const pathname = usePathname();
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
      <header className="relative flex flex-col items-center gap-2 border-b-[3px] border-gold bg-gradient-to-br from-navy to-navy-2 px-6 py-4 text-white print:hidden">
        <div className="flex items-center gap-2.5">
          <Brand companyName={companyName} logoDataUrl={logoDataUrl} />
          <h1 className="text-lg font-semibold tracking-tight">CounterBook</h1>
        </div>
        {companyName && (
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-medium text-white/80">
            {companyName}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="absolute right-4 top-4 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
        >
          ↩ Log out
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 shadow-[0_2px_6px_rgba(22,50,79,0.06)] print:hidden lg:justify-center">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-muted hover:text-accent"
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function Brand({ companyName, logoDataUrl }: { companyName: string; logoDataUrl: string }) {
  if (logoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoDataUrl} alt="Company logo" className="h-8 w-8 shrink-0 rounded-lg object-contain" />;
  }
  const initial = companyName.trim().charAt(0).toUpperCase() || "C";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold text-sm font-bold text-navy"
      aria-hidden
    >
      {initial}
    </span>
  );
}
