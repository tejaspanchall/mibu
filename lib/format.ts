import type { Currency } from "./types";

export function formatMoney(
  value: number | null | undefined,
  currency: Currency
): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 0 : 2;
  const fmt = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  return fmt.format(value);
}

export function formatNumber(value: number, max = 6) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(value);
}

export function formatQuantity(value: number, type?: "crypto" | "us" | "in") {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  let max: number;
  if (type === "crypto") {
    if (abs >= 100) max = 2;
    else if (abs >= 1) max = 4;
    else max = 6;
  } else {
    max = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(value);
}

export function formatPercent(value: number) {
  if (!isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function convert(
  value: number,
  from: Currency,
  to: Currency,
  fxUsdToInr: number | null
): number | null {
  if (from === to) return value;
  if (fxUsdToInr == null || !isFinite(fxUsdToInr) || fxUsdToInr <= 0) return null;
  if (from === "USD" && to === "INR") return value * fxUsdToInr;
  return value / fxUsdToInr;
}

function localDateFromIso(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(iso);
}

export function monthLabel(iso: string) {
  const d = localDateFromIso(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
}

export function dayLabel(iso: string) {
  const d = localDateFromIso(iso);
  return d
    .toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
    .toLowerCase();
}

export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
