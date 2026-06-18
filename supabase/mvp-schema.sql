create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null unique,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists role text not null default 'user',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists users_email_unique_idx
  on public.users (lower(email));

create unique index if not exists users_name_unique_idx
  on public.users (lower(name));

alter table public.users enable row level security;

drop policy if exists "Users can read their profile" on public.users;
create policy "Users can read their profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update their profile" on public.users;
create policy "Users can update their profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists name_en text,
  add column if not exists name_zh_tw text,
  add column if not exists name_zh_cn text,
  add column if not exists description_en text,
  add column if not exists description_zh_tw text,
  add column if not exists description_zh_cn text,
  add column if not exists image_urls text[],
  add column if not exists contact_phone text,
  add column if not exists contact_line_id text,
  add column if not exists contact_wechat_id text,
  add column if not exists quantity integer not null default 1 check (quantity >= 0),
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

create table if not exists public.user_presence (
  session_id text primary key,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

create index if not exists user_presence_last_seen_at_idx
  on public.user_presence (last_seen_at);

create table if not exists public.trade_requests (
  request_id uuid primary key default gen_random_uuid(),
  product_id text not null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  price_at_request numeric,
  note text,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_requests
  add column if not exists price_at_request numeric;

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
