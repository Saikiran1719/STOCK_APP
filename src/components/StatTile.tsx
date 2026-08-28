type Tone = "default" | "ok" | "warn" | "err";

const VALUE_COLOR: Record<Tone, string> = {
  default: "text-ink",
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
};

const BADGE_COLOR: Record<Tone, string> = {
  default: "bg-accent-soft",
  ok: "bg-ok-bg",
  warn: "bg-warn-bg",
  err: "bg-err-bg",
};

// Shared stat card used by the Dashboard, Reports, Cash & Bank, and Party
// ledger pages — an optional icon/emoji badge, a label, and a big number.
export default function StatTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <div className="shadow-card flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      {icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${BADGE_COLOR[tone]}`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`mt-0.5 truncate text-2xl font-bold tabular-nums ${VALUE_COLOR[tone]}`}>{value}</p>
      </div>
    </div>
  );
}
