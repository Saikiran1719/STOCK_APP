"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/stock-entry", label: "Stock Entry", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-300 print:hidden">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-sm font-semibold tracking-wide text-white">STOCK WAREHOUSE</p>
        <p className="text-xs text-slate-500">Inventory Console</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
