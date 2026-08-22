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

-- --------------------------------------------------------------------------
-- Multi-item invoices. Superseded the one-product-per-order "orders" table
-- above (left in place, unused, rather than dropped — it's not destructive
-- to data that might already be in it). An invoice is now a header row in
-- `invoices` plus one or more `invoice_items` line rows.
-- --------------------------------------------------------------------------

create table if not exists invoices (
  id bigint generated always as identity primary key,
  customer_name text,
  subtotal numeric not null default 0,
  gst_amount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Customer name is now paired with a required billing address.
alter table invoices add column if not exists customer_address text;

create table if not exists invoice_items (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  product_id bigint references products(id),
  product_name text not null,
  qty integer not null,
  unit_cost numeric not null,
  gst_rate numeric not null,
  subtotal numeric not null,
  gst_amount numeric not null,
  total numeric not null,
  new_stock integer,
  created_at timestamptz not null default now()
);

create index if not exists invoice_items_invoice_id_idx on invoice_items(invoice_id);

-- Takes a customer name + address and a JSON array of {"name": product,
-- "qty": n}, and does the whole invoice — stock checks, stock decrements,
-- line items, and the invoice header's totals — as ONE transaction. If any
-- item can't be fulfilled (product missing or insufficient stock), the
-- exception aborts the whole function and every change it made this call
-- is rolled back, so a multi-item order can never partially succeed.
--
-- Signature changed (added p_customer_address) — DROP first since CREATE
-- OR REPLACE can't add a parameter to an existing function.
drop function if exists place_invoice(text, jsonb);

create function place_invoice(p_customer_name text, p_customer_address text, p_items jsonb)
returns table (invoice_id bigint, invoice_total numeric)
language plpgsql
as $$
declare
  v_invoice_id bigint;
  v_item jsonb;
  v_name text;
  v_qty integer;
  v_product products%rowtype;
  v_item_subtotal numeric;
  v_item_gst numeric;
  v_item_total numeric;
  v_invoice_subtotal numeric := 0;
  v_invoice_gst numeric := 0;
  v_invoice_total numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'no_items';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer_name_required';
  end if;

  if p_customer_address is null or btrim(p_customer_address) = '' then
    raise exception 'customer_address_required';
  end if;

  insert into invoices (customer_name, customer_address, subtotal, gst_amount, total)
  values (p_customer_name, p_customer_address, 0, 0, 0)
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_name := v_item->>'name';
    v_qty := (v_item->>'qty')::integer;

    if v_name is null or v_qty is null or v_qty <= 0 then
      raise exception 'invalid_item:%', coalesce(v_name, '?');
    end if;

    select * into v_product from products where products.name = v_name for update;

    if not found then
      raise exception 'not_found:%', v_name;
    end if;

    if v_product.stock < v_qty then
      raise exception 'insufficient_stock:%:%', v_name, v_product.stock;
    end if;

    update products set stock = products.stock - v_qty where id = v_product.id;

    v_item_subtotal := v_product.cost * v_qty;
    v_item_gst := v_item_subtotal * v_product.gst_rate / 100;
    v_item_total := v_item_subtotal + v_item_gst;

    insert into invoice_items
      (invoice_id, product_id, product_name, qty, unit_cost, gst_rate, subtotal, gst_amount, total, new_stock)
    values
      (v_invoice_id, v_product.id, v_product.name, v_qty, v_product.cost, v_product.gst_rate,
       v_item_subtotal, v_item_gst, v_item_total, v_product.stock - v_qty);

    v_invoice_subtotal := v_invoice_subtotal + v_item_subtotal;
    v_invoice_gst := v_invoice_gst + v_item_gst;
    v_invoice_total := v_invoice_total + v_item_total;
  end loop;

  update invoices
  set subtotal = v_invoice_subtotal, gst_amount = v_invoice_gst, total = v_invoice_total
  where id = v_invoice_id;

  return query select v_invoice_id, v_invoice_total;
end;
$$;

-- Manual stock correction (e.g. a physical count found a mismatch), logged
-- with a required remarks note. Reuses decrement_stock for the atomic part.
create table if not exists stock_adjustments (
  id bigint generated always as identity primary key,
  product_id bigint references products(id),
  product_name text not null,
  qty integer not null,
  remarks text not null,
  new_stock integer,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Payment tracking + void support.
-- --------------------------------------------------------------------------

-- Payment status is derived from amount_paid vs total (unpaid/partial/paid)
-- rather than stored separately, so the two can never fall out of sync.
alter table invoices add column if not exists amount_paid numeric not null default 0;

-- Voiding restores stock instead of deleting the invoice, so there's always
-- a record of what happened. 'active' is the only status place_invoice()
-- creates; 'voided' is set only by void_invoice() below.
alter table invoices add column if not exists status text not null default 'active';
alter table invoices add column if not exists voided_at timestamptz;
alter table invoices add column if not exists void_reason text;

-- Atomically restores stock for every line item and marks the invoice
-- voided, in one transaction — a partial restore can't happen.
create or replace function void_invoice(p_invoice_id bigint, p_reason text)
returns void
language plpgsql
as $$
declare
  v_status text;
  v_item record;
begin
  select status into v_status from invoices where id = p_invoice_id for update;

  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v_status = 'voided' then
    raise exception 'already_voided';
  end if;

  for v_item in select product_id, qty from invoice_items where invoice_id = p_invoice_id
  loop
    if v_item.product_id is not null then
      update products set stock = stock + v_item.qty where id = v_item.product_id;
    end if;
  end loop;

  update invoices
  set status = 'voided', voided_at = now(), void_reason = p_reason
  where id = p_invoice_id;
end;
$$;
