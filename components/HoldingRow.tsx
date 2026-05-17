"use client";
import type { Currency, Holding, Quote } from "@/lib/types";
import { Avatar } from "./Avatar";
import { convert, formatMoney, formatPercent, formatQuantity } from "@/lib/format";

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
  fxUsdInr: number | null;
  onClick?: () => void;
}) {
  const livePrice = quote?.price;
  const valueNative = livePrice != null ? livePrice * holding.quantity : null;
  const costInBuyCcy = holding.buyPrice * holding.quantity;

  const valueDisplay =
    valueNative != null ? convert(valueNative, holding.currency, displayCurrency, fxUsdInr) : null;
  const costDisplay = convert(costInBuyCcy, holding.buyPriceCurrency, displayCurrency, fxUsdInr);

  const pnlDisplay =
    valueDisplay != null && costDisplay != null ? valueDisplay - costDisplay : null;
  const pnlPct =
    valueDisplay != null && costDisplay != null && costDisplay > 0
      ? (pnlDisplay! / costDisplay) * 100
      : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-chip/60 active:bg-chip transition duration-150 text-left"
    >
      <Avatar
        logo={holding.logo}
        type={holding.type}
        ticker={holding.ticker}
        seed={holding.symbol}
        label={holding.ticker}
        size={38}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate tracking-tight">{holding.name}</div>
        <div className="text-xs text-muted truncate tnum">
          {holding.ticker} · {formatQuantity(holding.quantity, holding.type)} ·{" "}
          {livePrice != null ? formatMoney(livePrice, holding.currency) : "—"}
        </div>
      </div>
      <div className="text-right shrink-0 max-w-[42%]">
        <div className="text-sm font-semibold whitespace-nowrap tnum">
          {formatMoney(valueDisplay, displayCurrency)}
        </div>
        {pnlDisplay != null && (
          <div
            className={`text-xs whitespace-nowrap tnum ${
              pnlDisplay >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {pnlDisplay >= 0 ? "+" : ""}
            {formatMoney(pnlDisplay, displayCurrency)}{" "}
            {pnlPct != null && (
              <span className="opacity-70">({formatPercent(pnlPct)})</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export function HoldingRowSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5">
      <div className="w-[38px] h-[38px] rounded-full skeleton shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/5 rounded-full skeleton" />
        <div className="h-2.5 w-3/5 rounded-full skeleton" />
      </div>
      <div className="space-y-2 items-end flex flex-col">
        <div className="h-3 w-20 rounded-full skeleton" />
        <div className="h-2.5 w-14 rounded-full skeleton" />
      </div>
    </div>
  );
}
