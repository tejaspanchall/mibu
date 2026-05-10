create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('crypto','us','in')),
  symbol text not null,
  ticker text not null,
  name text not null,
  logo text,
  currency text not null check (currency in ('USD','INR')),
  quantity numeric not null,
  buy_price numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  currency text not null check (currency in ('USD','INR')),
  emoji text not null,
  source text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists holdings_created_at_idx on public.holdings (created_at desc);
create index if not exists incomes_date_idx on public.incomes (date desc);

alter table public.holdings enable row level security;
alter table public.incomes enable row level security;

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
