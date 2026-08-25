# CounterBook

A billing and stock console: build a sale on an invoice-style entry grid (pick items,
qty, an optional discount — price and GST fill in automatically) and create a printable,
GST-compliant invoice (HSN/SAC codes, the full 0/5/12/18/28% rate slabs, a proper
financial-year invoice numbering series) that reduces stock, record vendor purchases
(stocks in with a real cost and vendor on record), collect/pay money with a mode
(cash/bank/UPI/cheque/other) and a running Cash & Bank ledger, void mistaken
invoices/purchases, browse/reprint every invoice ever placed, run monthly GST/sales
reports (including a GSTR-1-style HSN summary and a B2B/B2C split), manage
stock/products/GST rates, and keep a reusable party master — customers and vendors
alike — with a running ledger per party — all backed by Supabase (Postgres).
Password-gated, deployed on Vercel.

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
    table (`updateProduct` sets cost, GST rate, and HSN/SAC code together, from Stock
    Entry's "Edit product" form). `GST_RATES` is the full standard Indian slab set —
    `0/5/12/18/28`, not just the two the seed products happened to use.
  - `placeInvoice()` calls the `place_invoice` Postgres function (see
    `supabase/schema.sql`), which runs a whole multi-item order — every item's stock
    check, stock decrement, and line row, plus the invoice header — as **one
    transaction**. If any item can't be fulfilled, the exception rolls back everything
    that call did, so an invoice can never partially succeed (e.g. item 1 decremented
    but item 3 out of stock). Takes an optional `discountPercent` (0-100, clamped) —
    applied to every line's gross amount *before* that line's own GST is computed (the
    order GST rules require), so a mix of 5%/18% items on one invoice still taxes each
    item correctly on its own discounted base. `unit_cost` stored per line stays the
    original rate; `subtotal` is the discounted taxable value. Each line also freezes the
    product's HSN/SAC code at the time of sale (same reasoning as `unit_cost`/`gst_rate`
    — a later HSN edit shouldn't rewrite an old invoice). The invoice itself is assigned a
    real `invoice_no` at insert time — `{prefix}/{FY}/{00001}` (e.g. `INV/25-26/00042`),
    prefix configurable from Settings, sequence per financial year (Apr–Mar) via an
    atomic upsert-and-read-back counter (`invoice_number_counters`) so two invoices
    placed at the same moment can never collide on a number — not the raw database id,
    which is what GST rule 46 (consecutive, unique-per-FY numbering) actually expects.
    Invoices placed before this existed keep `invoice_no = null` and fall back to the old
    `INV-000123` display format, so they don't appear to change number after the fact.
    `getInvoices()` / `getInvoiceById()` read invoices back for the list and reprint
    screens.
  - `recordInvoicePayment()` calls the `record_invoice_payment` Postgres function: adds
    an amount (with a mode and optional reference) to what's already been paid and logs
    it to the `payments` table, atomically — not a "type the new total" overwrite, so
    every rupee collected has a mode and timestamp on record, not just a single number
    that could silently jump around. Rejects an amount over the actual balance due
    (returned in the error) rather than clamping it, so a typo is caught, not discarded.
    `recordPurchasePayment()` is the purchase-side mirror. Payment status
    (unpaid/partial/paid) is still always derived from `amount_paid` vs `total`, never
    stored separately, so the two can't drift out of sync — `payments` is the ledger
    behind that running total, not a replacement for it.
  - `getPayments(filter?)` reads the `payments` ledger, newest first — the whole Cash &
    Bank history, or (via `{partyId}` / `{invoiceId}` / `{purchaseId}`) just one party's
    or one document's payments, the same function powering all three views.
  - `voidInvoice()` calls the `void_invoice` Postgres function — atomically restores
    stock for every line item and marks the invoice voided, in one transaction, so a
    void can't partially restore stock. Requires a reason; voided invoices are excluded
    from `getReportSummary()`'s totals and can't be paid or voided again.
  - `restock()` / `removeStock()` call `increment_stock` / `decrement_stock`, the same
    atomic single-item pattern, for adding stock and for manual stock corrections
    (`removeStock` requires remarks and logs to `stock_adjustments`, readable via
    `getStockAdjustments()`).
  - `getReportSummary()` aggregates active (non-voided) invoices in a date range: total
    sales, GST collected, amount received/outstanding, a breakdown by GST rate slab, a
    GSTR-1-style HSN/SAC summary (Table 12 — grouped by HSN code + rate, with quantity),
    and a B2B/B2C split (Tables 4/7 — whether the billed party has a GSTIN on file,
    fetched in a second query keyed off the invoices actually in range) — the numbers a
    monthly GST return needs, not just a sales total.
  - `getSettings()` / `saveSettings()` read/write the single-row `company_settings`
    table (company name, address, GSTIN, currency symbol, invoice footer note, logo,
    invoice number prefix).
  - `getParties()` / `createParty()` / `updateParty()` / `getPartyLedger()` manage the
    `parties` table — a reusable customer master instead of retyping name/address on
    every sale. `placeInvoice()` takes an optional `partyId`: pass one to bill a party
    picked from the Dashboard's customer field directly, or omit it and `place_invoice()`
    resolves one itself by an exact case-insensitive name match, creating a new party
    from the name + address given if nothing matches — so parties build up automatically
    just from billing, no separate mandatory data-entry step. Either way the invoice
    keeps its own `customer_name`/`customer_address` snapshot, which never changes later
    even if the party's saved details do. `getParties(type)` aggregates each party's
    active transactions into a count, total billed/purchased, total paid, and
    outstanding/payable balance — `type` selects whether that's computed from `invoices`
    (customers) or `purchases` (vendors), the two tables share column names for exactly
    this reason.
  - `recordPurchase()` / `getPurchases()` / `getPurchaseById()` / `recordPurchasePayment()`
    / `voidPurchase()` are the purchase-side mirror of the invoice functions above —
    `recordPurchase()` calls the `record_purchase` Postgres function, which stocks in
    every item and resolves/creates a vendor party the same way `place_invoice()` does
    for customers, in one transaction. Deliberately never touches `products.cost` (the
    selling price) — purchase cost and selling price are kept as two different numbers.
    `voidPurchase()` reverses stock instead of restoring it, floored at zero in case some
    of that stock has already been sold on by the time a mistaken purchase is caught.
- `src/app/api/*` — route handlers: `login`, `logout`, `products` (GET list + POST
  create + PATCH price/GST), `restock` (POST), `stock-adjustments` (GET history + POST
  remove), `settings` (GET + PUT), `order` (POST, places a multi-item invoice — accepts
  an optional `partyId` and `discountPercent`), `invoices` (GET list), `invoices/[id]` (GET one + PATCH
  `{amount, mode, reference}` to record a payment, for the reprint page), `invoices/[id]/void` (POST),
  `invoices/export` (POST, builds and streams back an `.xlsx` file), `purchases` (GET list + POST record — accepts
  an optional `partyId`), `purchases/[id]` (GET one + PATCH `{amount, mode, reference}` to record a payment),
  `purchases/[id]/void` (POST), `parties` (GET list-with-balances, `?type=customer|vendor` + POST create),
  `parties/[id]` (GET party + their invoice-or-purchase ledger + PATCH update), `payments`
  (GET the Cash & Bank ledger; `?partyId=` / `?invoiceId=` / `?purchaseId=` narrows it), `reports`
  (GET, `?month=YYYY-MM`).
- `src/proxy.ts` — gates every page/API route behind a signed session cookie
  (`iron-session`), except `/login` and `/api/login`.
- `src/app/(app)/` — the app shell: `layout.tsx` renders the sidebar
  (`src/components/Sidebar.tsx`); routes inside it, in nav order:
  - `page.tsx` — **Dashboard**: KPI tiles (products, units in stock, low stock,
    inventory value) plus a "Start a new sale" call-to-action into its own tab. No stock
    table and no billing form here — both live on their own tabs so this screen stays a
    pure at-a-glance overview.
  - `sale/page.tsx` — **New Sale**: an editable, invoice-shaped entry grid (same
    black-ruled table styling as the printed invoice) — add rows, pick a product per
    row, and its Rate and GST% fill in automatically; qty is clamped to remaining stock
    (accounting for every other row using the same product). "Bill To" (customer name,
    backed by a `<datalist>` of saved parties — an exact match auto-fills their address
    and bills that party directly; a new name still works, and a party is created from
    it automatically on submit) sits top-left, with a Discount % field beside the
    address. Totals mirror the printed invoice — Gross/Discount rows only appear when a
    discount was actually entered — and submitting goes straight to the new invoice.
  - `parties/page.tsx` — **Parties**: a Customers/Vendors toggle over the same list —
    every saved party of that type, searchable, with a transaction count/total
    billed-or-purchased/outstanding-or-payable, and a form to add one manually.
  - `parties/[id]/page.tsx` — a party's own details (editable) plus their full
    transaction ledger — every invoice billed to them if they're a customer, or every
    purchase recorded against them if they're a vendor, newest first, linking through to
    each one's detail/print view — and, below that, every payment ever collected from or
    paid to them, with its mode and reference.
  - `stock/page.tsx` — **Stock**: every product's HSN/SAC code, cost, GST rate, current
    stock and status, in a searchable bordered/striped table.
  - `invoices/page.tsx` — **Invoices**: every invoice ever placed, newest first, with a
    date filter, a customer/product search box, and a payment-status column — find one
    and reprint it. A customer name links through to their party page when the invoice
    has one. Voided invoices show struck through with a "Voided" badge. An
    "Export to Excel" button posts whatever's currently filtered to
    `POST /api/invoices/export`, which uses `exceljs` to build a real `.xlsx` file —
    bold/shaded header row, borders on every cell, columns auto-fit to their content, and
    the header row frozen so it stays put while scrolling (the equivalent of Excel's own
    Alt H,B,A / Alt H,O,I / Alt W,F,R) — and streams it back for download. Money columns
    are real numbers with a `#,##0.00` format, not text, so totals sum correctly once
    opened.
  - `invoices/[id]/page.tsx` — the printable invoice itself (client-rendered, fetches
    from `/api/invoices/[id]`; the sidebar and back/print controls are hidden via
    `print:` classes when actually printed — use the Print button, or the browser's own
    print dialog / Ctrl+P). Line items carry an HSN/SAC column, same as a real GST tax
    invoice. Sets the page title to `Invoice No: {prefix}/{FY}/{00001}`, which browsers
    use as the print header and default PDF filename. Below the invoice
    (screen only): a "Record payment" form (amount, mode, optional reference — adds to
    what's already paid rather than overwriting it, and lists that invoice's own payment
    history underneath) and a "Void invoice" control (asks for a reason, then restores
    stock). A voided invoice shows a red VOIDED banner — printed too, not just on screen
    — instead of those controls.
  - `purchases/page.tsx` — **Purchases**: every vendor bill ever recorded, newest first,
    with the same date/search filtering as Invoices, plus a "+ New purchase" form — pick
    or type a vendor, add items with the actual cost paid per unit (pre-filled from the
    product's own price as a starting guess, but editable — the whole point is recording
    what you really paid). Submitting stocks in every item and goes straight to the new
    purchase's detail screen.
  - `purchases/[id]/page.tsx` — a purchase's line items (with the same HSN/SAC column)
    and totals (CGST/SGST split, same as an invoice), plus screen-only "Record payment"
    (same amount/mode/reference form and payment-history list as the invoice page) and
    "Void purchase" controls — voiding reverses the stock this purchase added instead of
    restoring it.
  - `payments/page.tsx` — **Cash & Bank**: every payment ever recorded, across every
    invoice and purchase, as one ledger — In/Out pills, party, the invoice/purchase it
    was against, mode, reference, and a running balance computed chronologically (so
    filtering the view never changes the historical numbers). Filter by type, mode, date,
    or a party/reference search; three tiles up top total in / total out / net balance.
  - `reports/page.tsx` — **Reports**: pick a month, see invoice count, taxable sales,
    GST collected, amount received/outstanding, a B2B-vs-B2C split, a per-GST-rate
    breakdown, and a GSTR-1-style HSN/SAC summary table — everything a CA would ask for
    when filing that month's return.
  - `stock-entry/page.tsx` — **Stock Entry**: add stock, remove stock (with required
    remarks, for physical count corrections — logged and shown in a "Recent stock
    adjustments" table on the same page), edit a product's price/GST rate/HSN code, or
    register a new product. The GST rate dropdown offers the full 0/5/12/18/28% slab set.
  - `settings/page.tsx` — **Settings**: company details used on invoices, plus an
    invoice number prefix (default `INV`) — new invoices look like
    `{prefix}/{FY}/{00001}`, with a live preview of the current financial year's format.
- `src/app/login/page.tsx` — the password screen.

GST: each product has a rate (0/5/12/18/28%, set from Stock Entry) and an optional
HSN/SAC code, both frozen onto every invoice/purchase line at the time of sale so a
later edit to the product doesn't rewrite an old document. Invoices split each item's
GST evenly into CGST + SGST on the printed invoice — the standard format for an
intra-state Indian sale. If this business ever bills across states, that half should
become IGST instead — not handled here.

## Try it now (demo mode, no Supabase project required)

`.env.local` already has a working `SESSION_SECRET` and `APP_PASSWORD=demo1234`. Without
real Supabase credentials the app runs in **demo mode**: every route above serves an
in-memory copy of the data instead of calling Supabase, so you can click through the
whole flow — build a multi-item sale (which saves the customer as a party the first
time, then reuses them on the next sale), get redirected straight to its invoice, find
and reprint it from the Invoices list, browse a party's ledger, add/remove stock,
register a product, edit settings — before any Supabase setup.

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
