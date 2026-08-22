# Stock Warehouse

An internal inventory console: place multi-item orders (reduces stock, generates a
printable GST invoice), browse/reprint every invoice ever placed, and manage
stock/products/GST rates from a dedicated screen — all backed by Supabase (Postgres).
Password-gated, deployed on Vercel.

## How it works

- `src/lib/db.ts` — talks to Supabase via `@supabase/supabase-js` using the service-role
  key (server-side only).
  - `getProducts()` / `createProduct()` / `updateProductGst()` read/write the `products`
    table.
  - `placeInvoice()` calls the `place_invoice` Postgres function (see
    `supabase/schema.sql`), which runs a whole multi-item order — every item's stock
    check, stock decrement, and line row, plus the invoice header — as **one
    transaction**. If any item can't be fulfilled, the exception rolls back everything
    that call did, so an invoice can never partially succeed (e.g. item 1 decremented
    but item 3 out of stock). `getInvoices()` / `getInvoiceById()` read invoices back
    for the list and reprint screens.
  - `restock()` / `removeStock()` call `increment_stock` / `decrement_stock`, the same
    atomic single-item pattern, for adding stock and for manual stock corrections
    (`removeStock` requires remarks and logs to `stock_adjustments`).
  - `getSettings()` / `saveSettings()` read/write the single-row `company_settings`
    table (company name, address, GSTIN, currency symbol, invoice footer note).
- `src/app/api/*` — route handlers: `login`, `logout`, `products` (GET list + POST
  create + PATCH GST rate), `restock` (POST), `stock-adjustments` (POST), `settings`
  (GET + PUT), `order` (POST, places a multi-item invoice), `invoices` (GET list),
  `invoices/[id]` (GET one, for the reprint page).
- `src/proxy.ts` — gates every page/API route behind a signed session cookie
  (`iron-session`), except `/login` and `/api/login`.
- `src/app/(app)/` — the app shell: `layout.tsx` renders the sidebar
  (`src/components/Sidebar.tsx`); routes inside it:
  - `page.tsx` — **Dashboard**: KPI tiles, multi-item order builder (add products to a
    cart, one customer name, one invoice), stock table.
  - `invoices/page.tsx` — **Invoices**: every invoice ever placed, newest first, with a
    date filter and a customer/product search box — find one and reprint it.
  - `invoices/[id]/page.tsx` — the printable invoice itself (client-rendered, fetches
    from `/api/invoices/[id]`; the sidebar and back/print controls are hidden via
    `print:` classes when actually printed — use the Print button, or the browser's own
    print dialog / Ctrl+P). Sets the page title to `Invoice No: INV-000123`, which
    browsers use as the print header and default PDF filename.
  - `stock-entry/page.tsx` — **Stock Entry**: add stock, remove stock (with required
    remarks, for physical count corrections), update a product's GST rate, or register a
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
   `products`, `invoices`, `invoice_items`, `stock_adjustments`, `company_settings`, the
   `place_invoice`/`decrement_stock`/`increment_stock` functions, and seeds the three
   original products. Every statement is idempotent, so if the schema changes later
   (like this GST/multi-item update did), re-running the whole file is always safe —
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
