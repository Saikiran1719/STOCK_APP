"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: "chart" }],
  },
  {
    label: "Sales",
    items: [
      { href: "/sale", label: "New Sale", icon: "shopping-cart" },
      { href: "/invoices", label: "Invoices", icon: "receipt" },
      { href: "/parties", label: "Parties", icon: "people" },
    ],
  },
  {
    label: "Purchasing",
    items: [{ href: "/purchases", label: "Purchases", icon: "download" }],
  },
  {
    label: "Inventory",
    items: [
      { href: "/stock", label: "Stock", icon: "box" },
      { href: "/stock-entry", label: "Stock Entry", icon: "clipboard" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/payments", label: "Cash & Bank", icon: "money" },
      { href: "/reports", label: "Reports", icon: "file" },
    ],
  },
  {
    label: "Workspace",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

// Exact match, or a real sub-route — "/stock" must not also light up on
// "/stock-entry" just because it's a string prefix.
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
      <div className="flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 text-white lg:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 leading-none text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="menu" />
        </button>
        <div className="flex items-center gap-2">
          <Brand companyName={companyName} logoDataUrl={logoDataUrl} compact />
          <p className="text-sm font-semibold tracking-tight">CounterBook</p>
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
        className={`themed-scroll fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full transform flex-col overflow-y-auto bg-navy text-white/70 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 print:hidden ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="h-[3px] shrink-0 bg-gradient-to-r from-accent to-accent-dark" />

        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Brand companyName={companyName} logoDataUrl={logoDataUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">CounterBook</p>
              <p className="truncate text-xs text-white/50">{companyName || "Billing & stock console"}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active ? "bg-accent text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <span className="inline-flex items-center gap-3">
              <Icon name="sign-out" size={17} /> Log out
            </span>
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
  const dims = compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  if (logoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoDataUrl} alt="Company logo" className={`${dims} shrink-0 rounded-lg object-contain`} />;
  }
  const initial = companyName.trim().charAt(0).toUpperCase() || "C";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-white`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
