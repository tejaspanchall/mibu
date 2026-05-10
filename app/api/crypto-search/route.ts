import { NextResponse } from "next/server";
import type { SearchResult } from "@/lib/types";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function search(q: string): Promise<SearchResult[]> {
  const r = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const j: any = await r.json();
  return (j.coins || []).slice(0, 10).map((c: any) => ({
    type: "crypto" as const,
    symbol: c.id,
    ticker: (c.symbol || "").toUpperCase(),
    name: c.name,
    logo: c.large || c.thumb,
    currency: "USD" as const
  }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const results = await cached("cg-search", q, 5 * 60_000, () => search(q), {
      staleOnError: true
    });
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e?.message || "search failed" }, { status: 200 });
  }
}
