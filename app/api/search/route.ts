import { NextResponse } from "next/server";
import type { SearchResult, AssetType } from "@/lib/types";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;

const ALLOWED_EX = new Set([
  "NASDAQ",
  "NYSE",
  "AMEX",
  "ARCA",
  "BATS",
  "NSE",
  "BSE"
]);

const EX_PRIORITY: Record<string, number> = {
  NASDAQ: 1,
  NYSE: 1,
  AMEX: 3,
  ARCA: 3,
  BATS: 3,
  NSE: 1,
  BSE: 2
};

function regionOf(item: any): "us" | "in" | null {
  const ex: string = item.exchange || "";
  if (ex === "NSE" || ex === "BSE" || item.country === "India") return "in";
  if (ALLOWED_EX.has(ex) && item.country === "United States") return "us";
  if (ex === "NASDAQ" || ex === "NYSE" || ex === "AMEX" || ex === "ARCA" || ex === "BATS") return "us";
  return null;
}

async function search(q: string): Promise<SearchResult[]> {
  if (!KEY) throw new Error("TWELVE_DATA_API_KEY not set");
  const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(
    q
  )}&outputsize=30&apikey=${KEY}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`twelvedata ${r.status}`);
  const j: any = await r.json();
  if (j.status === "error") throw new Error(j.message || "twelvedata error");
  const items: any[] = j.data || [];

  type Row = { item: any; type: AssetType; pri: number };
  const rows: Row[] = [];
  for (const item of items) {
    const ex: string = item.exchange || "";
    if (!ALLOWED_EX.has(ex)) continue;
    const region = regionOf(item);
    if (!region) continue;
    const itype: string = item.instrument_type || "";
    if (
      itype &&
      !["Common Stock", "ETF", "REIT", "Equity", "American Depositary Receipt", "Index Fund"].includes(itype)
    )
      continue;
    rows.push({ item, type: region, pri: EX_PRIORITY[ex] ?? 9 });
  }

  rows.sort((a, b) => a.pri - b.pri);
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const { item, type } of rows) {
    const composite = `${item.symbol}:${item.exchange}`;
    const key = `${type}:${item.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      type,
      symbol: composite,
      ticker: item.symbol,
      name: item.instrument_name || item.symbol,
      currency: type === "in" ? "INR" : "USD"
    });
    if (results.length >= 10) break;
  }
  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });
  if (!KEY) {
    return NextResponse.json({
      results: [],
      error: "TWELVE_DATA_API_KEY not set in .env.local"
    });
  }
  try {
    const results = await cached("td-search", q, 5 * 60_000, () => search(q), {
      staleOnError: true
    });
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e?.message || "search failed" });
  }
}
