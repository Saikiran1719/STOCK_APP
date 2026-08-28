// Shared list-table cells — one row divider per row, no vertical grid lines,
// used by every "N records" table across the app (Invoices, Parties,
// Purchases, Payments, Stock, Reports, Stock Entry). Printed documents
// (the invoice itself, the New Sale line-item grid) intentionally keep their
// own bordered-grid cells — this component is for on-screen data lists.
export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border px-4 py-3 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-border px-4 py-2.5 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

export const TABLE_HEAD_ROW = "bg-head text-left text-xs font-semibold uppercase tracking-wide text-muted";
