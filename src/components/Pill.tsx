type PillTone = "ok" | "warn" | "err" | "neutral";

const TONE_CLASS: Record<PillTone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  err: "bg-err-bg text-err",
  neutral: "bg-head text-muted",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

export function VoidedPill() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-err-bg px-2 py-0.5 text-xs font-medium text-err">
      ⊘ Voided
    </span>
  );
}

export type PaymentStatus = "unpaid" | "partial" | "paid";

export function PaymentPill({ status }: { status: PaymentStatus }) {
  if (status === "paid") return <Pill tone="ok">✓ Paid</Pill>;
  if (status === "partial") return <Pill tone="warn">◐ Partial</Pill>;
  return <Pill tone="err">! Unpaid</Pill>;
}

export function DirectionPill({ direction }: { direction: "in" | "out" }) {
  return direction === "in" ? <Pill tone="ok">↓ In</Pill> : <Pill tone="err">↑ Out</Pill>;
}

const LOW_STOCK_THRESHOLD = 10;

export function StockStatusPill({ stock }: { stock: number }) {
  if (stock <= 0) return <Pill tone="err">✕ Out of stock</Pill>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Pill tone="warn">⚠ Low stock</Pill>;
  return <Pill tone="ok">✓ In stock</Pill>;
}
