-- The VIP ticket price, editable from /admin/vip. One row; a null price means
-- sales are closed. Additive: nothing existing is touched.
create table if not exists public.vip_settings (
  id boolean primary key default true check (id),
  price_idr integer check (price_idr is null or price_idr > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.vip_settings (id) values (true) on conflict do nothing;

alter table public.vip_settings enable row level security;
revoke all on table public.vip_settings from anon, authenticated, public;
grant all on table public.vip_settings to postgres, service_role;
