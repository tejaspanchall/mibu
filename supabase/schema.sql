create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('crypto','us','in')),
  symbol text not null,
  ticker text not null,
  name text not null,
  logo text,
  currency text not null check (currency in ('USD','INR')),
  buy_price_currency text not null default 'USD' check (buy_price_currency in ('USD','INR')),
  quantity numeric not null check (quantity > 0),
  buy_price numeric not null check (buy_price > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('USD','INR')),
  emoji text not null,
  source text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  kind text not null check (kind in ('buy','sell')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price > 0),
  currency text not null check (currency in ('USD','INR')),
  fx_usd_inr numeric,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.holdings
  add column if not exists buy_price_currency text not null default 'USD'
  check (buy_price_currency in ('USD','INR'));

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'holdings_quantity_positive'
  ) then
    alter table public.holdings add constraint holdings_quantity_positive check (quantity > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'holdings_buy_price_positive'
  ) then
    alter table public.holdings add constraint holdings_buy_price_positive check (buy_price > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'incomes_amount_positive'
  ) then
    alter table public.incomes add constraint incomes_amount_positive check (amount > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'holdings_type_symbol_unique'
  ) then
    alter table public.holdings add constraint holdings_type_symbol_unique unique (type, symbol);
  end if;
end $$;

create index if not exists holdings_created_at_idx on public.holdings (created_at desc);
create index if not exists incomes_date_idx on public.incomes (date desc);
create index if not exists transactions_holding_id_idx on public.transactions (holding_id, date desc);

alter table public.holdings enable row level security;
alter table public.incomes enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "anon_all_holdings" on public.holdings;
create policy "anon_all_holdings" on public.holdings
  for all to anon
  using (true)
  with check (true);

drop policy if exists "anon_all_incomes" on public.incomes;
create policy "anon_all_incomes" on public.incomes
  for all to anon
  using (true)
  with check (true);

drop policy if exists "anon_all_transactions" on public.transactions;
create policy "anon_all_transactions" on public.transactions
  for all to anon
  using (true)
  with check (true);

do $$ begin
  insert into public.transactions (holding_id, kind, quantity, price, currency, date)
  select h.id, 'buy', h.quantity, h.buy_price, h.buy_price_currency, h.created_at::date
  from public.holdings h
  where not exists (select 1 from public.transactions t where t.holding_id = h.id);
end $$;
