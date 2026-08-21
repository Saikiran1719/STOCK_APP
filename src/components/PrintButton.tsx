"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
    >
      Print invoice
    </button>
  );
}
