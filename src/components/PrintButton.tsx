"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:shadow-md hover:shadow-teal-600/30"
    >
      Print invoice
    </button>
  );
}
