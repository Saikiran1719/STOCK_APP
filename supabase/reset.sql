-- Wipes ALL data (products, invoices, stock history, settings) but keeps
-- the schema (tables/functions) intact, then reseeds it back to the same
-- state a brand-new install would have. Irreversible — run only when you
-- actually want to start over.

truncate table
  invoice_items,
  invoices,
  stock_adjustments,
  orders,
  products,
  company_settings
restart identity cascade;

insert into company_settings (id) values (1);

insert into products (name, cost, stock) values
  ('MOUSE', 500, 100),
  ('KEYBOARD', 1000, 50),
  ('MONITER', 5000, 5);
