import type { Currency } from "./types";

export function formatMoney(value: number, currency: Currency, opts?: { compact?: boolean }) {
  const fmt = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: opts?.compact && Math.abs(value) >= 1000 ? 0 : 2,
    minimumFractionDigits: opts?.compact && Math.abs(value) >= 1000 ? 0 : 2,
    notation: opts?.compact && Math.abs(value) >= 100000 ? "compact" : "standard"
  });
  return fmt.format(value);
}

export function formatNumber(value: number, max = 6) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function convert(value: number, from: Currency, to: Currency, fxUsdToInr: number) {
  if (from === to) return value;
  if (from === "USD" && to === "INR") return value * fxUsdToInr;
  return value / fxUsdToInr;
}

export function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export function todayIso() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function letterColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const palette = [
    "#1f2937", "#0f766e", "#0369a1", "#7c3aed", "#be185d",
    "#b45309", "#15803d", "#9f1239", "#4338ca", "#0e7490"
  ];
  return palette[hash % palette.length];
}
