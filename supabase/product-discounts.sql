alter table public.products
  add column if not exists discount_percent integer not null default 0,
  add column if not exists effective_price numeric
    generated always as (
      round(price::numeric * (100 - discount_percent) / 100, 2)
    ) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_discount_percent_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_discount_percent_check
      check (discount_percent in (0, 10, 20, 30, 50));
  end if;
end
$$;
