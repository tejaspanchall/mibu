"use client";
import { type ReactNode } from "react";
import type { ChartRange } from "@/lib/hooks";

const RANGES: ChartRange[] = ["1d", "1w", "1m", "3m", "6m", "1y", "3y", "all"];

export function PortfolioHero({
  value,
  pnlSub,
  range,
  onRangeChange,
  extra
}: {
  value: ReactNode;
  pnlSub: ReactNode;
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-paper border border-line px-5 py-5 lg:px-7 lg:py-6 text-center">
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {RANGES.map(r => (
          <RangePill
            key={r}
            active={range === r}
            onClick={() => onRangeChange(r)}
            label={r}
          />
        ))}
      </div>

      <div className="mt-3 text-[40px] lg:text-[58px] leading-none font-semibold tracking-tighter tnum">
        {value}
      </div>

      {pnlSub && <div className="mt-3 text-sm tnum">{pnlSub}</div>}

      {extra && <div className="mt-2 text-[11px] text-muted tnum">{extra}</div>}
    </div>
  );
}

function RangePill({
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
      className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition duration-200 tracking-wide ${
        active ? "bg-ink text-paper shadow-soft" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
