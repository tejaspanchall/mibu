// Server-side only. Do NOT import from client components.
// NSE official API has no key but requires Akamai bot-manager cookies (bm_sz, _abck)
// obtained by hitting an HTML page first. Cookies are reused for ~20 min.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const HOMEPAGE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1"
};

const API_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  "X-Requested-With": "XMLHttpRequest",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
};

const COOKIE_TTL = 20 * 60_000;

let cookieCache: { value: string; expiresAt: number } | null = null;

async function getCookies(force = false): Promise<string> {
  if (!force && cookieCache && cookieCache.expiresAt > Date.now()) {
    return cookieCache.value;
  }
  const r = await fetch("https://www.nseindia.com/option-chain", {
    headers: HOMEPAGE_HEADERS,
    cache: "no-store"
  });
  const setCookies: string[] = (r.headers as any).getSetCookie?.() || [];
  if (!setCookies.length) {
    throw new Error("nse: no cookies issued");
  }
  const value = setCookies
    .map(c => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  cookieCache = { value, expiresAt: Date.now() + COOKIE_TTL };
  return value;
}

async function nseFetch<T>(path: string): Promise<T> {
  let cookies = await getCookies();
  let r = await fetch(`https://www.nseindia.com${path}`, {
    headers: { ...API_HEADERS, Cookie: cookies },
    cache: "no-store"
  });
  if (r.status === 401 || r.status === 403) {
    cookies = await getCookies(true);
    r = await fetch(`https://www.nseindia.com${path}`, {
      headers: { ...API_HEADERS, Cookie: cookies },
      cache: "no-store"
    });
  }
  if (!r.ok) throw new Error(`nse ${r.status}`);
  return r.json() as Promise<T>;
}

export type NseSearchHit = { symbol: string; name: string };

export async function nseSearch(query: string): Promise<NseSearchHit[]> {
  const j: any = await nseFetch(
    `/api/search/autocomplete?q=${encodeURIComponent(query)}`
  );
  const items: any[] = j?.symbols || [];
  const out: NseSearchHit[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!it?.symbol) continue;
    // Filter out non-equity instruments (indices, mutual funds, options, etc.)
    const url: string = it.url || "";
    const series: string = (it.activeSeries && it.activeSeries[0]) || "";
    if (series && series !== "EQ" && series !== "BE") continue;
    if (url && !url.includes("/equity")) continue;
    const symbol = String(it.symbol).trim().toUpperCase();
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      symbol,
      name: String(it.symbol_info || symbol).trim()
    });
    if (out.length >= 10) break;
  }
  return out;
}

export type NseQuote = { price: number };

export async function nseQuote(symbol: string): Promise<NseQuote | null> {
  try {
    const j: any = await nseFetch(
      `/api/quote-equity?symbol=${encodeURIComponent(symbol.toUpperCase())}`
    );
    const price = j?.priceInfo?.lastPrice;
    if (typeof price === "number" && price > 0) {
      return { price };
    }
    return null;
  } catch {
    return null;
  }
}
