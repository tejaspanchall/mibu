import { NextResponse } from "next/server";
import type { SearchResult } from "@/lib/types";
import { cached } from "@/lib/server-cache";
import { nseSearch } from "@/lib/nse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;

const ALLOWED_US_EX = new Set(["NASDAQ", "NYSE", "AMEX", "ARCA", "BATS"]);
const EX_PRIORITY: Record<string, number> = {
  NASDAQ: 1,
  NYSE: 1,
  AMEX: 3,
  ARCA: 3,
  BATS: 3
};
const ALLOWED_TYPES = new Set([
  "Common Stock",
  "ETF",
  "Exchange-Traded Fund",
  "REIT",
  "Equity",
  "American Depositary Receipt",
  "ADR",
  "Mutual Fund",
  "Index",
  "Index Fund",
  "Preferred Stock"
]);

const POPULATED_TTL = 5 * 60_000; // good results: cache 5 min
const EMPTY_TTL = 30_000;         // empty results: cache 30s so transient failures don't get stuck

async function tdUsSearchRaw(q: string): Promise<SearchResult[]> {
  if (!KEY) return [];
  const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(
    q
  )}&outputsize=30&apikey=${KEY}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`td ${r.status}`);
  const j: any = await r.json();
  if (j?.status === "error") throw new Error(j?.message || "td error");
  const items: any[] = j.data || [];

  type Row = { item: any; pri: number };
  const rows: Row[] = [];
  for (const item of items) {
    const ex: string = item.exchange || "";
    if (!ALLOWED_US_EX.has(ex)) continue;
    if (item.country && item.country !== "United States") continue;
    const itype: string = item.instrument_type || "";
    if (itype && !ALLOWED_TYPES.has(itype)) continue;
    rows.push({ item, pri: EX_PRIORITY[ex] ?? 9 });
  }
  rows.sort((a, b) => a.pri - b.pri);

  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const { item } of rows) {
    const sym = String(item.symbol);
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push({
      type: "us",
      symbol: `${sym}:${item.exchange}`,
      ticker: sym,
      name: item.instrument_name || sym,
      currency: "USD"
    });
    if (out.length >= 10) break;
  }
  return out;
}

async function nseInSearchRaw(q: string): Promise<SearchResult[]> {
  const items = await nseSearch(q); // throws on cookie/network failure
  return items.map(it => ({
    type: "in" as const,
    symbol: `${it.symbol}:NSE`,
    ticker: it.symbol,
    name: it.name,
    currency: "INR" as const
  }));
}

async function combined(q: string): Promise<SearchResult[]> {
  const [us, ind] = await Promise.all([
    cached("search-us", q, POPULATED_TTL, () => tdUsSearchRaw(q), {
      staleOnError: true,
      emptyTtlMs: EMPTY_TTL
    }).catch(() => [] as SearchResult[]),
    cached("search-in", q, POPULATED_TTL, () => nseInSearchRaw(q), {
      staleOnError: true,
      emptyTtlMs: EMPTY_TTL
    }).catch(() => [] as SearchResult[])
  ]);

  // Interleave: each provider's top hit stays at the top.
  const merged: SearchResult[] = [];
  const max = Math.max(us.length, ind.length);
  for (let i = 0; i < max && merged.length < 12; i++) {
    if (i < ind.length) merged.push(ind[i]);
    if (i < us.length && merged.length < 12) merged.push(us[i]);
  }
  return merged;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const results = await combined(q);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e?.message || "search failed" });
  }
}
