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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
  add column if not exists client_request_id text,
  add column if not exists quantity integer not null default 1 check (quantity >= 0),
  add column if not exists status text not null default 'available' check (status in ('available', 'pending', 'sold', 'removed')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists products_seller_client_request_unique_idx
  on public.products (seller_id, client_request_id)
  where client_request_id is not null;

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

create table if not exists public.wanted_requests (
  wanted_request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (length(trim(query)) > 0),
  max_price numeric check (max_price is null or max_price > 0),
  category text,
  description text,
  email_subscribed boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'fulfilled', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wanted_requests
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists query text,
  add column if not exists max_price numeric,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists email_subscribed boolean not null default true,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists wanted_requests_user_created_idx
  on public.wanted_requests (user_id, created_at desc)
  where status <> 'deleted';

create index if not exists wanted_requests_active_subscribed_idx
  on public.wanted_requests (status, email_subscribed, category)
  where status = 'active' and email_subscribed = true;

alter table public.wanted_requests enable row level security;

drop policy if exists "Users can create wanted requests" on public.wanted_requests;
create policy "Users can create wanted requests"
  on public.wanted_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can read their wanted requests" on public.wanted_requests;
create policy "Users can read their wanted requests"
  on public.wanted_requests
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update their wanted requests" on public.wanted_requests;
create policy "Users can update their wanted requests"
  on public.wanted_requests
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.wanted_request_matches (
  match_id uuid primary key default gen_random_uuid(),
  wanted_request_id uuid not null references public.wanted_requests(wanted_request_id) on delete cascade,
  product_id text not null,
  score numeric,
  emailed_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  unique (wanted_request_id, product_id)
);

alter table public.wanted_request_matches
  add column if not exists wanted_request_id uuid references public.wanted_requests(wanted_request_id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists score numeric,
  add column if not exists emailed_at timestamptz,
  add column if not exists email_error text,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists wanted_request_matches_unique_idx
  on public.wanted_request_matches (wanted_request_id, product_id);

create index if not exists wanted_request_matches_request_created_idx
  on public.wanted_request_matches (wanted_request_id, created_at desc);

alter table public.wanted_request_matches enable row level security;

drop policy if exists "Users can read their wanted request matches" on public.wanted_request_matches;
create policy "Users can read their wanted request matches"
  on public.wanted_request_matches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wanted_requests
      where wanted_requests.wanted_request_id = wanted_request_matches.wanted_request_id
        and wanted_requests.user_id = auth.uid()
    )
  );

create table if not exists public.notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  request_id uuid references public.trade_requests(request_id) on delete cascade,
  product_id text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  email_error text,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists request_id uuid references public.trade_requests(request_id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz,
  add column if not exists emailed_at timestamptz,
  add column if not exists email_error text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
