create extension if not exists pgcrypto;

alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'available' check (status in ('available', 'pending', 'sold', 'removed')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.products enable row level security;

drop policy if exists "Anyone can read available products" on public.products;
create policy "Anyone can read available products"
  on public.products
  for select
  to anon, authenticated
  using (status = 'available');

drop policy if exists "Sellers can create their products" on public.products;
create policy "Sellers can create their products"
  on public.products
  for insert
  to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "Sellers can update their products" on public.products;
create policy "Sellers can update their products"
  on public.products
  for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create table if not exists public.trade_requests (
  request_id uuid primary key default gen_random_uuid(),
  product_id text not null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  note text,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_requests enable row level security;

create policy "Buyers can create trade requests"
  on public.trade_requests
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

create policy "Buyers can read their trade requests"
  on public.trade_requests
  for select
  to authenticated
  using (buyer_id = auth.uid());
