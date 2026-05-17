import type { AssetType } from "./types";

export function syncLogoUrlFor(type: AssetType, ticker: string): string | null {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  if (type === "in") return `https://eodhd.com/img/logos/NSE/${t}.png`;
  return null;
}
