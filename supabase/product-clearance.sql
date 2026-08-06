begin;

alter table public.products
  add column if not exists clearance_price numeric;

alter table public.products
  drop constraint if exists products_clearance_price_check;

alter table public.products
  add constraint products_clearance_price_check
  check (clearance_price is null or clearance_price in (0, 1));

alter table public.products drop column if exists effective_price;

alter table public.products
  add column effective_price numeric
    generated always as (
      coalesce(
        clearance_price,
        round(price::numeric * (100 - discount_percent) / 100, 2)
      )
    ) stored;

commit;

-- Rollback:
-- begin;
-- alter table public.products drop column if exists effective_price;
-- alter table public.products drop constraint if exists products_clearance_price_check;
-- alter table public.products drop column if exists clearance_price;
-- alter table public.products add column effective_price numeric
--   generated always as (
--     round(price::numeric * (100 - discount_percent) / 100, 2)
--   ) stored;
-- commit;
