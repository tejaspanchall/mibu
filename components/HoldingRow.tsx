"use client";
import type { Currency, Holding, Quote } from "@/lib/types";
import { Avatar } from "./Avatar";
import { convert, formatMoney, formatPercent } from "@/lib/format";

export function HoldingRow({
  holding,
  quote,
  displayCurrency,
  fxUsdInr,
  onClick
}: {
  holding: Holding;
  quote?: Quote;
  displayCurrency: Currency;
  fxUsdInr: number;
  onClick?: () => void;
}) {
  const livePrice = quote?.price;
  const value = livePrice != null ? livePrice * holding.quantity : null;
  const cost = holding.buyPrice * holding.quantity;
  const pnl = value != null ? value - cost : null;
  const pnlPct = value != null && cost > 0 ? ((value - cost) / cost) * 100 : null;

  const valueDisplay =
    value != null
      ? formatMoney(convert(value, holding.currency, displayCurrency, fxUsdInr), displayCurrency)
      : "—";
  const pnlDisplay =
    pnl != null
      ? formatMoney(convert(pnl, holding.currency, displayCurrency, fxUsdInr), displayCurrency)
      : "";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-chip text-left"
    >
      <Avatar logo={holding.logo} seed={holding.symbol} label={holding.ticker} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{holding.name}</div>
        <div className="text-xs text-muted">
          {holding.ticker} · {holding.quantity} ·{" "}
          {livePrice != null
            ? formatMoney(livePrice, holding.currency)
            : "—"}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold">{valueDisplay}</div>
        {pnl != null && (
          <div className={`text-xs ${pnl >= 0 ? "text-positive" : "text-negative"}`}>
            {pnl >= 0 ? "+" : ""}
            {pnlDisplay} {pnlPct != null && <span className="opacity-70">({formatPercent(pnlPct)})</span>}
          </div>
        )}
      </div>
    </button>
  );
}
