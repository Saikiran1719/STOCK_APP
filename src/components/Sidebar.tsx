"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/stock-entry", label: "Stock Entry", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        <p className="text-sm font-semibold tracking-wide">STOCK WAREHOUSE</p>
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
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">STOCK WAREHOUSE</p>
            <p className="text-xs text-slate-500">Inventory Console</p>
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
                    ? "border-l-2 border-blue-500 bg-slate-800 text-white"
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
