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
    <div className="inline-flex bg-chip rounded-full p-0.5 text-xs font-medium">
      {(["USD", "INR"] as Currency[]).map(c => {
        const active = value === c;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`px-3 py-1 rounded-full transition ${
              active ? "bg-paper text-ink shadow-sm" : "text-muted"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
