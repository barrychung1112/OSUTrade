create extension if not exists pgcrypto;

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
