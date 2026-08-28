"use client";

import Icon from "@/components/Icon";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
    >
      <Icon name="printer" size={16} /> Print invoice
    </button>
  );
}
