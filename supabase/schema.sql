create table public.holdings (
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
  created_at timestamptz not null default now(),
  unique (type, symbol)
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('USD','INR')),
  emoji text not null,
  source text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table public.transactions (
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

create index holdings_created_at_idx on public.holdings (created_at desc);
create index incomes_date_idx on public.incomes (date desc);
create index transactions_holding_id_idx on public.transactions (holding_id, date desc);

alter table public.holdings enable row level security;
alter table public.incomes enable row level security;
alter table public.transactions enable row level security;

create policy "anon_all_holdings" on public.holdings
  for all to anon
  using (true)
  with check (true);

create policy "anon_all_incomes" on public.incomes
  for all to anon
  using (true)
  with check (true);

create policy "anon_all_transactions" on public.transactions
  for all to anon
  using (true)
  with check (true);
