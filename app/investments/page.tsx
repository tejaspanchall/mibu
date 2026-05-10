"use client";
import { useCallback, useMemo, useState } from "react";
import { useHoldings, useDisplayCurrency } from "@/lib/storage";
import { useFx, usePrices } from "@/lib/hooks";
import { convert, formatMoney, formatPercent } from "@/lib/format";
import { HoldingRow } from "@/components/HoldingRow";
import { AddHoldingSheet } from "@/components/AddHoldingSheet";
import { ConfirmDelete } from "@/components/ConfirmRow";
import { useRegisterAdd } from "@/components/AppShell";
import type { AssetType } from "@/lib/types";

type Filter = "all" | "crypto" | "us" | "in";

export default function InvestmentsPage() {
  const { holdings, add, remove, hydrated, error } = useHoldings();
  const [displayCcy] = useDisplayCurrency();
  const { usdInr } = useFx();
  const { quotes, updatedAt } = usePrices(holdings);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  useRegisterAdd(openSheet);

  const filtered = useMemo(
    () => (filter === "all" ? holdings : holdings.filter(h => h.type === filter)),
    [holdings, filter]
  );

  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    for (const h of holdings) {
      const q = quotes[h.symbol];
      const px = q?.price ?? h.buyPrice;
      value += convert(px * h.quantity, h.currency, displayCcy, usdInr);
      cost += convert(h.buyPrice * h.quantity, h.currency, displayCcy, usdInr);
    }
    const pnl = value - cost;
    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { value, cost, pnl, pct };
  }, [holdings, quotes, displayCcy, usdInr]);

  const confirming = useMemo(() => holdings.find(h => h.id === confirmId) || null, [confirmId, holdings]);

  return (
    <div className="px-5 lg:px-0 pt-2 lg:pt-0">
      <div className="text-center mb-2 lg:mb-4">
        <div className="text-[44px] lg:text-[64px] leading-none font-semibold tracking-tight">
          {formatMoney(totals.value, displayCcy, { compact: true })}
        </div>
        {holdings.length > 0 && (
          <div
            className={`mt-2 text-sm ${
              totals.pnl >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {totals.pnl >= 0 ? "+" : ""}
            {formatMoney(totals.pnl, displayCcy)}{" "}
            <span className="opacity-70">({formatPercent(totals.pct)})</span>
          </div>
        )}
        {holdings.length > 0 && (
          <div className="mt-1 text-[11px] text-muted">
            1 USD = ₹{usdInr.toFixed(2)}
            {updatedAt && ` · updated ${timeAgo(updatedAt)}`}
          </div>
        )}
      </div>

      <div className="flex gap-2 my-5 overflow-x-auto no-scrollbar">
        {(["all", "crypto", "us", "in"] as Filter[]).map(f => (
          <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)} label={labelFor(f)} />
        ))}
      </div>

      {error && (
        <div className="text-xs text-negative bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {hydrated && holdings.length === 0 && !error && <Empty title="no holdings yet" hint="tap + to add your first one" />}

      <div className="space-y-0.5">
        {filtered.map(h => (
          <HoldingRow
            key={h.id}
            holding={h}
            quote={quotes[h.symbol]}
            displayCurrency={displayCcy}
            fxUsdInr={usdInr}
            onClick={() => setConfirmId(h.id)}
          />
        ))}
      </div>

      <AddHoldingSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={add}
      />

      <ConfirmDelete
        open={!!confirming}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirming && remove(confirming.id)}
        title={`delete ${confirming?.ticker || ""}?`}
        description="this only removes it from your tracker."
      />
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
        active ? "bg-ink text-paper" : "bg-chip text-muted"
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

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mt-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
