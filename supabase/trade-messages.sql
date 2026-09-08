-- OSUTrade trade-message migration
-- Run this once in the Supabase SQL editor before enabling TRADE_MESSAGES_ENABLED.

alter table public.trade_requests
  add column if not exists accepted_at timestamptz;

update public.trade_requests
  set accepted_at = coalesce(updated_at, created_at)
  where accepted_at is null
    and status in ('accepted', 'completed');

create or replace function public.transition_seller_trade_request(
  p_request_id uuid,
  p_seller_id uuid,
  p_action text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trade_requests%rowtype;
  v_product public.products%rowtype;
  v_remaining_quantity integer;
  v_auto_declined jsonb := '[]'::jsonb;
begin
  if p_action not in ('accept', 'decline', 'complete', 'cancel') then
    raise exception using errcode = 'P0001', message = 'INVALID_ACTION';
  end if;

  select * into v_request
    from public.trade_requests
    where request_id = p_request_id
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND';
  end if;

  select * into v_product
    from public.products
    where product_id::text = v_request.product_id
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
  end if;

  if v_product.seller_id is distinct from p_seller_id then
    raise exception using errcode = 'P0001', message = 'SELLER_NOT_AUTHORIZED';
  end if;
  if p_action in ('accept', 'decline') and v_request.status <> 'sent' then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  if p_action in ('complete', 'cancel') and v_request.status <> 'accepted' then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  if p_action in ('accept', 'decline')
    and p_now > v_request.created_at + interval '48 hours' then
    raise exception using errcode = 'P0001', message = 'REQUEST_EXPIRED';
  end if;

  if p_action = 'accept' then
    if v_product.status <> 'available'
      or v_product.quantity < v_request.quantity then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;
    v_remaining_quantity := v_product.quantity - v_request.quantity;
    update public.products
      set quantity = v_remaining_quantity,
          status = case when v_remaining_quantity = 0 then 'pending' else 'available' end,
          updated_at = p_now
      where product_id = v_product.product_id
      returning * into v_product;
    update public.trade_requests
      set status = 'accepted',
          accepted_at = p_now,
          updated_at = p_now
      where request_id = p_request_id
      returning * into v_request;
    if v_remaining_quantity = 0 then
      with declined as (
        update public.trade_requests
          set status = 'declined', updated_at = p_now
          where product_id = v_request.product_id
            and request_id <> v_request.request_id
            and status = 'sent'
          returning *
      )
      select coalesce(jsonb_agg(to_jsonb(declined)), '[]'::jsonb)
        into v_auto_declined
        from declined;
    end if;
  elsif p_action = 'decline' then
    update public.trade_requests
      set status = 'declined', updated_at = p_now
      where request_id = p_request_id
      returning * into v_request;
  elsif p_action = 'complete' then
    update public.trade_requests
      set status = 'completed', updated_at = p_now
      where request_id = p_request_id
      returning * into v_request;
  else
    update public.products
      set quantity = v_product.quantity + v_request.quantity,
          status = 'available',
          updated_at = p_now
      where product_id = v_product.product_id
      returning * into v_product;
    update public.trade_requests
      set status = 'cancelled', updated_at = p_now
      where request_id = p_request_id
      returning * into v_request;
  end if;

  return jsonb_build_object(
    'request', to_jsonb(v_request),
    'product', to_jsonb(v_product),
    'autoDeclined', v_auto_declined
  );
end;
$$;

revoke all on function public.transition_seller_trade_request(
  uuid, uuid, text, timestamptz
) from public;
grant execute on function public.transition_seller_trade_request(
  uuid, uuid, text, timestamptz
) to service_role;

create table if not exists public.trade_messages (
  message_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.trade_requests(request_id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  unique (request_id, sender_id, client_message_id)
);

create table if not exists public.trade_message_reads (
  request_id uuid not null references public.trade_requests(request_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (request_id, user_id)
);

create index if not exists trade_messages_request_created_idx
  on public.trade_messages (request_id, created_at, message_id);
create index if not exists trade_message_reads_user_request_idx
  on public.trade_message_reads (user_id, request_id);

create or replace function public.can_access_trade_messages(
  p_request_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and exists (
    select 1
    from public.trade_requests
    join public.products
      on products.product_id::text = trade_requests.product_id
    where trade_requests.request_id = p_request_id
      and trade_requests.accepted_at is not null
      and trade_requests.status in ('accepted', 'completed', 'cancelled')
      and p_user_id in (trade_requests.buyer_id, products.seller_id)
  );
$$;

create or replace function public.can_access_trade_message_topic(
  p_topic text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_topic ~ '^trade-message:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_access_trade_messages(substring(p_topic from 15)::uuid, p_user_id)
    else false
  end;
$$;

revoke all on function public.can_access_trade_messages(uuid, uuid) from public;
grant execute on function public.can_access_trade_messages(uuid, uuid)
  to authenticated, service_role;
revoke all on function public.can_access_trade_message_topic(text, uuid) from public;
grant execute on function public.can_access_trade_message_topic(text, uuid)
  to authenticated, service_role;

alter table public.trade_messages enable row level security;
alter table public.trade_message_reads enable row level security;
revoke all on table public.trade_messages from anon, authenticated;
revoke all on table public.trade_message_reads from anon, authenticated;

drop policy if exists "Trade message participants can receive broadcasts" on realtime.messages;
create policy "Trade message participants can receive broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.can_access_trade_message_topic(realtime.topic(), auth.uid())
  );

create or replace function public.broadcast_trade_message_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'requestId', new.request_id,
      'messageId', new.message_id,
      'senderId', new.sender_id,
      'createdAt', new.created_at
    ),
    'message_created',
    'trade-message:' || new.request_id::text,
    true
  );
  return new;
end;
$$;

revoke all on function public.broadcast_trade_message_created() from public;

drop trigger if exists trade_message_created_broadcast on public.trade_messages;
create trigger trade_message_created_broadcast
  after insert on public.trade_messages
  for each row
  execute function public.broadcast_trade_message_created();
