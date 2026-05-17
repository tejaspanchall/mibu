"use client";
import { type ReactNode } from "react";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

export function IncomeHero({
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  canGoNextMonth,
  canGoNextYear,
  value,
  pnlSub,
  extra
}: {
  selectedYear: number;
  selectedMonth: number; // 1-12
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  canGoNextMonth: boolean;
  canGoNextYear: boolean;
  value: ReactNode;
  pnlSub: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-paper border border-line px-5 py-5 lg:px-7 lg:py-6 text-center">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <ArrowGroup
          label={MONTHS[selectedMonth - 1]}
          onPrev={onPrevMonth}
          onNext={onNextMonth}
          canNext={canGoNextMonth}
          minLabelWidth={72}
        />
        <ArrowGroup
          label={String(selectedYear)}
          onPrev={onPrevYear}
          onNext={onNextYear}
          canNext={canGoNextYear}
          minLabelWidth={36}
          tnum
        />
      </div>

      <div className="mt-3 text-[40px] lg:text-[58px] leading-none font-semibold tracking-tighter tnum">
        {value}
      </div>

      {pnlSub && <div className="mt-3 text-sm tnum">{pnlSub}</div>}

      {extra && <div className="mt-2 text-[11px] text-muted tnum">{extra}</div>}
    </div>
  );
}

function ArrowGroup({
  label,
  onPrev,
  onNext,
  canNext,
  minLabelWidth,
  tnum
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
  minLabelWidth: number;
  tnum?: boolean;
}) {
  return (
    <div className="inline-flex items-center bg-chip rounded-full px-0.5 py-0.5 text-[11px] font-medium">
      <NavArrow direction="prev" onClick={onPrev} disabled={false} />
      <span
        className={`px-2 text-ink text-center ${tnum ? "tnum" : ""}`}
        style={{ minWidth: minLabelWidth }}
      >
        {label}
      </span>
      <NavArrow direction="next" onClick={onNext} disabled={!canNext} />
    </div>
  );
}

function NavArrow({
  direction,
  onClick,
  disabled
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "previous" : "next"}
      className="w-6 h-6 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {direction === "prev" ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
      </svg>
    </button>
  );
}
