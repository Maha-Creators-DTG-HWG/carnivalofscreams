-- VIP ticket add-on for guests who reserved a table. Purely additive: nothing
-- here touches the existing reservation tables.

-- How many VIP tickets one booking may buy. No row = the default in lib/vip.ts.
create table if not exists public.vip_limits (
  reservation_order_id text primary key references public.reservations(order_id) on delete cascade,
  max_tickets integer not null check (max_tickets >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vip_orders (
  order_id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  reservation_order_id text not null references public.reservations(order_id),
  quantity integer not null check (quantity > 0),
  unit_price_idr integer not null,
  amount_idr integer not null,
  status text not null default 'pending',
  payment_url text,
  payment_token text,
  channel_id text,
  transaction_status text,
  paid_at timestamptz,
  expires_at timestamptz,
  email_sent_at timestamptz,
  whatsapp_sent_at timestamptz
);

create index if not exists vip_orders_reservation_idx on public.vip_orders (reservation_order_id);
create index if not exists vip_orders_created_at_idx on public.vip_orders (created_at desc);

-- One call checks the booking, counts what it already holds and inserts the
-- order. The row lock on the reservation makes two simultaneous purchases
-- queue up, so the limit cannot be passed by racing. A pending order only
-- counts until its payment window closes.
create or replace function public.create_vip_order(
  p_order_id text,
  p_reservation text,
  p_quantity integer,
  p_unit_price integer,
  p_expires timestamptz,
  p_default_limit integer
) returns text
language plpgsql
as $$
declare
  v_limit integer;
  v_used integer;
begin
  perform 1
    from public.reservations
    where order_id = p_reservation
      and status = 'paid'
      and channel_id is distinct from 'manual'
    for update;
  if not found then
    return 'no_booking';
  end if;

  select coalesce(
    (select max_tickets from public.vip_limits where reservation_order_id = p_reservation),
    p_default_limit
  ) into v_limit;

  select coalesce(sum(quantity), 0) into v_used
    from public.vip_orders
    where reservation_order_id = p_reservation
      and (status = 'paid' or (status = 'pending' and expires_at > now()));

  if v_used + p_quantity > v_limit then
    return 'over_limit';
  end if;

  insert into public.vip_orders
    (order_id, reservation_order_id, quantity, unit_price_idr, amount_idr, expires_at)
  values
    (p_order_id, p_reservation, p_quantity, p_unit_price, p_unit_price * p_quantity, p_expires);
  return 'ok';
end;
$$;

alter table public.vip_limits enable row level security;
alter table public.vip_orders enable row level security;

revoke all on table public.vip_limits from anon, authenticated, public;
revoke all on table public.vip_orders from anon, authenticated, public;
revoke all on function public.create_vip_order(text, text, integer, integer, timestamptz, integer)
  from anon, authenticated, public;

grant all on table public.vip_limits to postgres, service_role;
grant all on table public.vip_orders to postgres, service_role;
grant execute on function public.create_vip_order(text, text, integer, integer, timestamptz, integer)
  to postgres, service_role;
