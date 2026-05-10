"use client";
import type { Currency, Income } from "@/lib/types";
import { convert, dayLabel, formatMoney } from "@/lib/format";

export function IncomeRow({
  income,
  displayCurrency,
  fxUsdInr,
  onClick
}: {
  income: Income;
  displayCurrency: Currency;
  fxUsdInr: number;
  onClick?: () => void;
}) {
  const display = convert(income.amount, income.currency, displayCurrency, fxUsdInr);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-chip text-left"
    >
      <div className="w-10 h-10 rounded-full bg-chip grid place-items-center text-xl">
        {income.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{income.source}</div>
        <div className="text-xs text-muted">{dayLabel(income.date)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-positive">+{formatMoney(display, displayCurrency)}</div>
        {income.currency !== displayCurrency && (
          <div className="text-[11px] text-muted">{formatMoney(income.amount, income.currency)}</div>
        )}
      </div>
    </button>
  );
}
