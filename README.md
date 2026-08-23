# CounterBook

An internal inventory console: place multi-item orders (reduces stock, generates a
printable GST invoice), track payment and void mistaken invoices, browse/reprint every
invoice ever placed, run monthly GST/sales reports, and manage stock/products/GST rates
from a dedicated screen — all backed by Supabase (Postgres). Password-gated, deployed on
Vercel.

## Look and feel

- **Brand identity** — **CounterBook** (renamed from the internal "Stock Warehouse"
  project name). Visual style is a "Modern SAP Fiori / Horizon" theme: a navy sidebar
  with a gold accent line, SAP-blue (`#0a6ed1`) primary actions, a light blue-gray
  workspace background, Poppins for headings/UI text, and dense
  bordered/striped/hover-highlighted tables — closer to the polished, professional feel
  of SAP Business One / Fiori-style ERP consoles than a generic admin-template look.
  All theme colors are CSS custom properties in `src/app/globals.css`, mapped into
  Tailwind v4's `@theme inline` block (`bg-navy`, `text-accent`, `bg-card`,
  `border-line`, `text-ok`/`text-err`/`text-warn`, etc.) so the palette is defined once
  and used as ordinary utility classes everywhere.
- **Navigation** — a persistent navy sidebar on desktop (product brand + the logged-in
  company's own logo, or a generated gold monogram); on narrow screens it becomes a
  hamburger-triggered off-canvas drawer instead (`src/components/Sidebar.tsx`) — the
  familiar mobile pattern, so every destination is one clearly-labeled tap away rather
  than something to discover by scrolling.
- **Company logo** — upload one on Settings (stored as a data URL on `company_settings`,
  no separate file storage needed). Shows in the sidebar (with a generated gold
  monogram as the fallback when there's no logo yet) and on every invoice header.
- **Product avatars** — every product gets a deterministic colored initial avatar
  (`src/lib/productColor.ts` hashes the name to a fixed palette, independent of the
  brand theme), so the same product reads as the same color everywhere — the Stock
  table, the order cart, stock adjustment history.
- **Status at a glance** — stock/payment/void indicators are icon-prefixed pills
  (✓ In stock, ⚠ Low stock, ✕ Out of stock, ✓ Paid, ◐ Partial, ! Unpaid, ⊘ Voided) rather
  than plain colored text, and card headers carry a small icon each.

## How it works

- `src/lib/db.ts` — talks to Supabase via `@supabase/supabase-js` using the service-role
  key (server-side only).
  - `getProducts()` / `createProduct()` / `updateProduct()` read/write the `products`
    table (`updateProduct` sets cost and GST rate together, from Stock Entry's "Edit
    product" form).
  - `placeInvoice()` calls the `place_invoice` Postgres function (see
    `supabase/schema.sql`), which runs a whole multi-item order — every item's stock
    check, stock decrement, and line row, plus the invoice header — as **one
    transaction**. If any item can't be fulfilled, the exception rolls back everything
    that call did, so an invoice can never partially succeed (e.g. item 1 decremented
    but item 3 out of stock). `getInvoices()` / `getInvoiceById()` read invoices back
    for the list and reprint screens.
  - `updateInvoicePayment()` records `amount_paid` on an invoice; payment status
    (unpaid/partial/paid) is always derived from `amount_paid` vs `total`, never stored
    separately, so the two can't drift out of sync.
  - `voidInvoice()` calls the `void_invoice` Postgres function — atomically restores
    stock for every line item and marks the invoice voided, in one transaction, so a
    void can't partially restore stock. Requires a reason; voided invoices are excluded
    from `getReportSummary()`'s totals and can't be paid or voided again.
  - `restock()` / `removeStock()` call `increment_stock` / `decrement_stock`, the same
    atomic single-item pattern, for adding stock and for manual stock corrections
    (`removeStock` requires remarks and logs to `stock_adjustments`, readable via
    `getStockAdjustments()`).
  - `getReportSummary()` aggregates active (non-voided) invoices in a date range: total
    sales, GST collected, amount received/outstanding, and a breakdown by GST rate slab
    — the numbers a monthly GST return needs.
  - `getSettings()` / `saveSettings()` read/write the single-row `company_settings`
    table (company name, address, GSTIN, currency symbol, invoice footer note, logo).
- `src/app/api/*` — route handlers: `login`, `logout`, `products` (GET list + POST
  create + PATCH price/GST), `restock` (POST), `stock-adjustments` (GET history + POST
  remove), `settings` (GET + PUT), `order` (POST, places a multi-item invoice),
  `invoices` (GET list), `invoices/[id]` (GET one + PATCH payment, for the reprint
  page), `invoices/[id]/void` (POST), `reports` (GET, `?month=YYYY-MM`).
- `src/proxy.ts` — gates every page/API route behind a signed session cookie
  (`iron-session`), except `/login` and `/api/login`.
- `src/app/(app)/` — the app shell: `layout.tsx` renders the sidebar
  (`src/components/Sidebar.tsx`); routes inside it, in nav order:
  - `page.tsx` — **Dashboard**: KPI tiles (products, units in stock, low stock,
    inventory value) and the "New sale" cart builder (add products to a cart,
    required customer name + address, one invoice on submit). No stock table here —
    that lives on its own tab so the order-entry screen stays focused.
  - `stock/page.tsx` — **Stock**: every product's cost, GST rate, current stock and
    status, in a searchable bordered/striped table.
  - `invoices/page.tsx` — **Invoices**: every invoice ever placed, newest first, with a
    date filter, a customer/product search box, and a payment-status column — find one
    and reprint it. Voided invoices show struck through with a "Voided" badge. An
    "Export to Excel" button downloads whatever's currently filtered as a CSV (invoice
    number, date, customer, address, items, subtotal/GST/total/paid/balance, payment and
    void status) — built client-side from the data already on screen, no extra API call.
    A UTF-8 BOM is prepended so Excel renders ₹ and non-ASCII names correctly instead of
    as mojibake.
  - `invoices/[id]/page.tsx` — the printable invoice itself (client-rendered, fetches
    from `/api/invoices/[id]`; the sidebar and back/print controls are hidden via
    `print:` classes when actually printed — use the Print button, or the browser's own
    print dialog / Ctrl+P). Sets the page title to `Invoice No: INV-000123`, which
    browsers use as the print header and default PDF filename. Below the invoice
    (screen only): a "Record payment" form and a "Void invoice" control (asks for a
    reason, then restores stock). A voided invoice shows a red VOIDED banner — printed
    too, not just on screen — instead of those controls.
  - `reports/page.tsx` — **Reports**: pick a month, see invoice count, taxable sales,
    GST collected, amount received/outstanding, and a per-GST-rate breakdown.
  - `stock-entry/page.tsx` — **Stock Entry**: add stock, remove stock (with required
    remarks, for physical count corrections — logged and shown in a "Recent stock
    adjustments" table on the same page), edit a product's price/GST rate, or register a
    new product.
  - `settings/page.tsx` — **Settings**: company details used on invoices.
- `src/app/login/page.tsx` — the password screen.

GST: each product has a rate (5% or 18%, set from Stock Entry). Invoices split each
item's GST evenly into CGST + SGST on the printed invoice — the standard format for an
intra-state Indian sale. If this business ever bills across states, that half should
become IGST instead — not handled here.

## Try it now (demo mode, no Supabase project required)

`.env.local` already has a working `SESSION_SECRET` and `APP_PASSWORD=demo1234`. Without
real Supabase credentials the app runs in **demo mode**: every route above serves an
in-memory copy of the data instead of calling Supabase, so you can click through the
whole flow — build a multi-item order, get redirected straight to its invoice, find and
reprint it from the Invoices list, add/remove stock, register a product, edit settings —
before any Supabase setup.

```bash
npm run dev
```

Open http://localhost:3000, log in with `demo1234`. An amber "Demo mode" banner appears
on the dashboard while real credentials aren't set. Demo data resets whenever the dev
server restarts, and (unlike real Supabase, a real shared database) isn't guaranteed to
persist consistently between requests in production on Vercel, where each route can run
as its own serverless function with its own memory — demo mode is meant for local
click-through, not a hosted demo.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [supabase/schema.sql](supabase/schema.sql) — creates
   `products`, `invoices` (with payment/void columns), `invoice_items`,
   `stock_adjustments`, `company_settings`, the
   `place_invoice`/`void_invoice`/`decrement_stock`/`increment_stock` functions, and
   seeds the three original products. Every statement is idempotent, so if the schema
   changes later (as it has a few times), re-running the whole file is always safe —
   existing data is untouched, only what's missing gets added.
3. In Project Settings → API, copy the **Project URL** and the **service_role** key
   (not the anon/public key — the service role key is what lets the server write to the
   tables; it must never be exposed to the browser).

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role secret |
| `APP_PASSWORD` | the shared password whoever uses the app will type |
| `SESSION_SECRET` | random 32+ char string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## 3. Run locally

```bash
npm run dev
```

Visit **Settings** first and fill in company details — they show up on every invoice
from then on.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, **Add New Project** → import the repo (framework preset: Next.js, auto-detected).
3. In the project's **Settings → Environment Variables**, add all four variables above.
4. Deploy. Share the Vercel URL and the `APP_PASSWORD`.
