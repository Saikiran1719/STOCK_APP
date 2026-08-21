-- Run this in the Supabase project's SQL Editor. Every statement here is
-- idempotent (IF NOT EXISTS / OR REPLACE / etc.), so it's safe to re-run the
-- whole file again after adding new sections below.

create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null unique,
  cost numeric not null default 0,
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  product_id bigint references products(id),
  product_name text not null,
  qty integer not null,
  new_stock integer not null,
  created_at timestamptz not null default now()
);

-- Extra columns used by the invoice screen.
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists unit_cost numeric;
alter table orders add column if not exists total numeric;

-- GST: each product has a rate (5% or 18%, set from Stock Entry); orders
-- freeze the rate + computed amounts at the time of sale, same idea as
-- freezing unit_cost, so a later rate change doesn't rewrite old invoices.
alter table products add column if not exists gst_rate numeric not null default 18;
alter table orders add column if not exists gst_rate numeric;
alter table orders add column if not exists subtotal numeric;
alter table orders add column if not exists gst_amount numeric;

-- decrement_stock/increment_stock now also return gst_rate, so a function
-- signature change — DROP is required because CREATE OR REPLACE can't alter
-- an existing RETURNS TABLE shape.
drop function if exists decrement_stock(text, integer);
drop function if exists increment_stock(text, integer);

-- Atomically checks stock and decrements it in a single locked statement,
-- so two simultaneous orders for the same product can never oversell it
-- (a real fix for the race condition the Google Sheets version could only
-- minimize, not eliminate).
create function decrement_stock(p_name text, p_qty integer)
returns table (id bigint, name text, cost numeric, stock integer, gst_rate numeric)
language plpgsql
as $$
begin
  return query
    update products
    set stock = products.stock - p_qty
    where products.name = p_name and products.stock >= p_qty
    returning products.id, products.name, products.cost, products.stock, products.gst_rate;
end;
$$;

-- Atomically adds stock — used by the Stock Entry screen to restock an
-- existing product.
create function increment_stock(p_name text, p_qty integer)
returns table (id bigint, name text, cost numeric, stock integer, gst_rate numeric)
language plpgsql
as $$
begin
  return query
    update products
    set stock = products.stock + p_qty
    where products.name = p_name
    returning products.id, products.name, products.cost, products.stock, products.gst_rate;
end;
$$;

-- Single-row table holding the company details shown on printed invoices,
-- edited from the Settings screen.
create table if not exists company_settings (
  id integer primary key default 1,
  company_name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  gstin text not null default '',
  currency_symbol text not null default '',
  invoice_note text not null default 'Thank you for your business.',
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id = 1)
);

insert into company_settings (id) values (1) on conflict (id) do nothing;

-- Seed data matching the original "Stock Warehouse" Google Sheet.
insert into products (name, cost, stock) values
  ('MOUSE', 500, 100),
  ('KEYBOARD', 1000, 50),
  ('MONITER', 5000, 5)
on conflict (name) do nothing;
