import { NextResponse } from "next/server";
import type { Quote } from "@/lib/types";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function priceBatch(ids: string[]): Promise<Quote[]> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids.join(",")
  )}&vs_currencies=usd`;
  const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const j: Record<string, { usd: number }> = await r.json();
  return ids
    .filter(id => j[id]?.usd != null)
    .map(id => ({ symbol: id, price: j[id].usd, currency: "USD" as const }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("ids") || "").trim();
  if (!raw) return NextResponse.json({ quotes: [] });
  const ids = Array.from(new Set(raw.split(",").map(s => s.trim()).filter(Boolean))).slice(0, 50).sort();
  const key = ids.join(",");
  try {
    const quotes = await cached("cg-price", key, 30_000, () => priceBatch(ids), {
      staleOnError: true
    });
    return NextResponse.json({ quotes });
  } catch (e: any) {
    return NextResponse.json({ quotes: [], error: e?.message || "price failed" }, { status: 200 });
  }
}
