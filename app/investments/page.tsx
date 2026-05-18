"use client";
import { useCallback, useMemo, useState } from "react";
import { useHoldings, useDisplayCurrency } from "@/lib/storage";
import { useFx, usePrices, usePortfolioStartValue, type ChartRange } from "@/lib/hooks";
import { convert, formatMoney, formatPercent } from "@/lib/format";
import { HoldingRow, HoldingRowSkeleton } from "@/components/HoldingRow";
import { AddHoldingSheet } from "@/components/AddHoldingSheet";
import { EditHoldingSheet } from "@/components/EditHoldingSheet";
import { useRegisterAdd } from "@/components/AppShell";
import { ListCard } from "@/components/ui/Cards";
import { PortfolioHero } from "@/components/PortfolioHero";
import { useReportPortfolioTone } from "@/lib/portfolioTone";
import type { AssetType } from "@/lib/types";

type Filter = "all" | "crypto" | "us" | "in";

export default function InvestmentsPage() {
  const {
    holdings,
    transactionsByHolding,
    addHoldingOrTx,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setHoldingCurrency,
    remove,
    hydrated,
    error
  } = useHoldings();
  const [displayCcy] = useDisplayCurrency();
  const { usdInr } = useFx();
  const { quotes } = usePrices(holdings);

  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [range, setRange] = useState<ChartRange>("1d");

  const openAdd = useCallback(() => setAddOpen(true), []);
  useRegisterAdd(openAdd);

  const present = useMemo(() => {
    const set = new Set<AssetType>();
    holdings.forEach(h => set.add(h.type));
    return set;
  }, [holdings]);

  const filtered = useMemo(
    () => (filter === "all" ? holdings : holdings.filter(h => h.type === filter)),
    [holdings, filter]
  );

  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    let unconverted = false;
    for (const h of holdings) {
      const px = quotes[h.symbol]?.price;
      if (px == null) {
        unconverted = true;
        continue;
      }
      const v = convert(px * h.quantity, h.currency, displayCcy, usdInr);
      const c = convert(h.buyPrice * h.quantity, h.buyPriceCurrency, displayCcy, usdInr);
      if (v == null || c == null) {
        unconverted = true;
        continue;
      }
      value += v;
      cost += c;
    }
    const pnl = value - cost;
    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { value, cost, pnl, pct, unconverted };
  }, [holdings, quotes, displayCcy, usdInr]);

  const { startValue } = usePortfolioStartValue(holdings, displayCcy, usdInr, range);

  const periodPnl = useMemo(() => {
    if (range === "all" || startValue == null) {
      return { pnl: totals.pnl, pct: totals.pct, baseline: "cost" as const };
    }
    const pnl = totals.value - startValue;
    const pct = startValue > 0 ? (pnl / startValue) * 100 : 0;
    return { pnl, pct, baseline: "period" as const };
  }, [range, startValue, totals]);

  const tone: "positive" | "negative" | "neutral" =
    holdings.length === 0 ? "neutral" : periodPnl.pnl >= 0 ? "positive" : "negative";
  useReportPortfolioTone(tone);

  const editing = useMemo(
    () => holdings.find(h => h.id === editId) || null,
    [editId, holdings]
  );

  const filters: Filter[] = useMemo(() => {
    const list: Filter[] = ["all"];
    if (present.has("crypto")) list.push("crypto");
    if (present.has("us")) list.push("us");
    if (present.has("in")) list.push("in");
    return list;
  }, [present]);

  const heroBlocked =
    usdInr == null &&
    holdings.some(h => h.currency !== displayCcy || h.buyPriceCurrency !== displayCcy);

  const heroValue = heroBlocked ? "—" : formatMoney(totals.value, displayCcy);

  const heroSub =
    holdings.length === 0 ? null : (
      <span className={periodPnl.pnl >= 0 ? "text-positive" : "text-negative"}>
        {periodPnl.pnl >= 0 ? "↑ +" : "↓ "}
        {formatMoney(periodPnl.pnl, displayCcy)}{" "}
        <span className="opacity-70">({formatPercent(periodPnl.pct)})</span>
        {periodPnl.baseline === "period" && (
          <span className="opacity-70"> · past {range}</span>
        )}
      </span>
    );

  const costLine = (
    <>
      cost <span className="opacity-70">·</span>{" "}
      {formatMoney(totals.cost, displayCcy)}
    </>
  );

  return (
    <div className="space-y-3">
      <PortfolioHero
        value={heroValue}
        pnlSub={heroSub}
        range={range}
        onRangeChange={setRange}
        extra={costLine}
      />

      {error && (
        <div className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
          {error}
        </div>
      )}

      {!hydrated && (
        <ListCard>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <HoldingRowSkeleton />
              {i < 3 && <Divider />}
            </div>
          ))}
        </ListCard>
      )}

      {hydrated && holdings.length === 0 && !error && (
        <Empty
          icon="📈"
          title="no holdings yet"
          hint="tap the + button to add your first one"
        />
      )}

      {hydrated && holdings.length > 0 && (
        <ListCard
          header={
            <div className="flex items-center gap-3 px-4 py-3">
              {filters.length > 1 ? (
                <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {filters.map(f => (
                    <FilterPill
                      key={f}
                      active={filter === f}
                      onClick={() => setFilter(f)}
                      label={labelFor(f)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <div className="text-xs text-muted tnum shrink-0">{filtered.length}</div>
            </div>
          }
        >
          {filtered.map((h, i) => (
            <div key={h.id}>
              <HoldingRow
                holding={h}
                quote={quotes[h.symbol]}
                displayCurrency={displayCcy}
                fxUsdInr={usdInr}
                onClick={() => setEditId(h.id)}
              />
              {i < filtered.length - 1 && <Divider />}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted">
              no {labelFor(filter)} in your portfolio
            </div>
          )}
        </ListCard>
      )}

      <AddHoldingSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={input => addHoldingOrTx(input, usdInr)}
      />

      <EditHoldingSheet
        open={!!editing}
        holding={editing}
        transactions={editing ? transactionsByHolding[editing.id] ?? [] : []}
        fxUsdInr={usdInr}
        onClose={() => setEditId(null)}
        onAddTransaction={addTransaction}
        onUpdateTransaction={updateTransaction}
        onDeleteTransaction={removeTransaction}
        onSetCurrency={setHoldingCurrency}
        onDelete={remove}
      />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line/70 mx-4" aria-hidden />;
}

function FilterPill({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-3 py-1 rounded-full whitespace-nowrap font-medium transition duration-200 ${
        active
          ? "bg-ink text-paper shadow-soft"
          : "bg-chip text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function labelFor(f: AssetType | "all") {
  if (f === "all") return "all";
  if (f === "crypto") return "crypto";
  if (f === "us") return "us stocks";
  return "in stocks";
}

function Empty({
  icon,
  title,
  hint
}: {
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mt-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-chip grid place-items-center text-2xl">
        {icon}
      </div>
      <div className="mt-4 text-sm font-medium tracking-tight">{title}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}

