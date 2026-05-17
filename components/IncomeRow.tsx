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
  fxUsdInr: number | null;
  onClick?: () => void;
}) {
  const display = convert(income.amount, income.currency, displayCurrency, fxUsdInr);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-chip/60 active:bg-chip transition duration-150 text-left"
    >
      <div className="w-10 h-10 rounded-full bg-chip grid place-items-center text-xl shrink-0">
        {income.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate tracking-tight">{income.source}</div>
        <div className="text-xs text-muted">{dayLabel(income.date)}</div>
      </div>
      <div className="text-right shrink-0 max-w-[42%]">
        <div className="text-sm font-semibold text-positive whitespace-nowrap tnum">
          +{formatMoney(display, displayCurrency)}
        </div>
        {income.currency !== displayCurrency && (
          <div className="text-[11px] text-muted whitespace-nowrap tnum">
            {formatMoney(income.amount, income.currency)}
          </div>
        )}
      </div>
    </button>
  );
}

export function IncomeRowSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5">
      <div className="w-10 h-10 rounded-full skeleton shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/5 rounded-full skeleton" />
        <div className="h-2.5 w-1/4 rounded-full skeleton" />
      </div>
      <div className="space-y-2 items-end flex flex-col">
        <div className="h-3 w-20 rounded-full skeleton" />
      </div>
    </div>
  );
}
