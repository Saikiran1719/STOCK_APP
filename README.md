# Stock Warehouse

An internal inventory console: view stock, place orders (reduces stock, generates a
printable invoice), and manage stock/products from a dedicated screen — all backed by
Supabase (Postgres). Password-gated, deployed on Vercel.

## How it works

- `src/lib/db.ts` — talks to Supabase via `@supabase/supabase-js` using the service-role
  key (server-side only).
  - `getProducts()` / `createProduct()` read/write the `products` table.
  - `placeOrder()` calls the `decrement_stock` Postgres function (see
    `supabase/schema.sql`), which checks stock and decrements it in a single atomic
    statement — two simultaneous orders for the same product can never oversell it. The
    order is logged to `orders` with unit cost/total/customer name, doubling as the
    invoice record; `getOrderById()` reads it back for the invoice page.
  - `restock()` calls `increment_stock`, the same atomic pattern in reverse, for adding
    stock from the Stock Entry screen.
  - `getSettings()` / `saveSettings()` read/write the single-row `company_settings`
    table (company name, address, GSTIN, currency symbol, invoice footer note).
- `src/app/api/*` — route handlers: `login`, `logout`, `products` (GET list + POST
  create), `restock` (POST), `settings` (GET + PUT), `order` (POST).
- `src/proxy.ts` — gates every page/API route behind a signed session cookie
  (`iron-session`), except `/login` and `/api/login`.
- `src/app/(app)/` — the app shell: `layout.tsx` renders the sidebar
  (`src/components/Sidebar.tsx`); routes inside it:
  - `page.tsx` — **Dashboard**: KPI tiles, order form (product, qty, optional
    customer/bill-to name), stock table.
  - `stock-entry/page.tsx` — **Stock Entry**: add stock to an existing product, or
    register a new one.
  - `settings/page.tsx` — **Settings**: company details used on invoices.
  - `invoice/[id]/page.tsx` — printable invoice for one order (Server Component, reads
    straight from `db.ts`; the sidebar and back/print controls are hidden via `print:`
    classes when actually printed — use the browser's print dialog, e.g. Ctrl/Cmd+P,
    from the Print button).
- `src/app/login/page.tsx` — the password screen.

## Try it now (demo mode, no Supabase project required)

`.env.local` already has a working `SESSION_SECRET` and `APP_PASSWORD=demo1234`. Without
real Supabase credentials the app runs in **demo mode**: every route above serves an
in-memory copy of the data instead of calling Supabase, so you can click through the
whole flow — place an order, view/print its invoice, add stock, register a product, edit
settings — before any Supabase setup.

```bash
npm run dev
```

Open http://localhost:3000, log in with `demo1234`. An amber "Demo mode" banner appears
on the dashboard while real credentials aren't set. Demo data resets whenever the dev
server restarts, and (unlike real Supabase) isn't guaranteed to persist between requests
in production on Vercel — demo mode is meant for local click-through, not a hosted demo.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [supabase/schema.sql](supabase/schema.sql) — creates
   `products`, `orders`, `company_settings`, the `decrement_stock`/`increment_stock`
   functions, and seeds the three original products. Every statement is idempotent, so
   if the schema changes later, re-running the whole file is always safe.
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
