"use client";
import type { Currency } from "@/lib/types";

export function CurrencyToggle({
  value,
  onChange
}: {
  value: Currency;
  onChange: (v: Currency) => void;
}) {
  return (
    <div className="inline-flex bg-chip rounded-full p-0.5 text-[11px] font-medium">
      {(["USD", "INR"] as Currency[]).map(c => {
        const active = value === c;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`px-3 py-1.5 rounded-full transition duration-200 tracking-wide ${
              active ? "bg-paper text-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {c.toLowerCase()}
          </button>
        );
      })}
    </div>
  );
}
