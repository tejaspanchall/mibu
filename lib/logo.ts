import type { AssetType } from "./types";
import { NSE_DOMAINS } from "./logos/nse";

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

export function syncLogoUrlFor(type: AssetType, ticker: string): string | null {
  if (!ticker || !LOGO_DEV_TOKEN) return null;
  const t = ticker.toUpperCase();

  if (type === "us") {
    return `https://img.logo.dev/ticker/${encodeURIComponent(t)}?token=${LOGO_DEV_TOKEN}&size=128&format=png&retina=true`;
  }

  if (type === "in") {
    const domain = NSE_DOMAINS[t];
    if (!domain) return null;
    return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${LOGO_DEV_TOKEN}&size=128&format=png&retina=true`;
  }

  return null;
}
