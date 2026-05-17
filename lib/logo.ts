import type { AssetType } from "./types";

// Synchronous logo URL derivation. Returns null when no deterministic URL
// exists — callers should fall back to async lookup via /api/logo.
//
// IN stocks: EODHD has a high-quality public CDN at /img/logos/NSE/{TICKER}.png.
// US stocks: ticker → company-website mapping requires Twelve Data's /logo
//   endpoint, so the client fetches /api/logo asynchronously.
// Crypto: the CoinGecko URL is stored on the row at add-time.
export function syncLogoUrlFor(type: AssetType, ticker: string): string | null {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  if (type === "in") return `https://eodhd.com/img/logos/NSE/${t}.png`;
  return null;
}
