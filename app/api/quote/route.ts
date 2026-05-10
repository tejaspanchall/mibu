import { NextResponse } from "next/server";
import type { Quote, Currency } from "@/lib/types";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;

function parsePrice(j: any): number | null {
  const candidates = [j?.price, j?.close, j?.last];
  for (const v of candidates) {
    const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function tdQuote(composite: string): Promise<Quote> {
  if (!KEY) throw new Error("TWELVE_DATA_API_KEY not set");
  const [ticker, exchange] = composite.split(":");
  if (!ticker) throw new Error("bad symbol");
  const params = new URLSearchParams({ symbol: ticker, apikey: KEY });
  if (exchange) params.set("exchange", exchange);
  const url = `https://api.twelvedata.com/quote?${params.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`twelvedata ${r.status}`);
  const j: any = await r.json();
  if (j.status === "error" || j.code) throw new Error(j.message || "td error");
  const price = parsePrice(j);
  if (price == null) throw new Error("no price");
  const ccy: Currency = j.currency === "INR" ? "INR" : exchange === "NSE" || exchange === "BSE" ? "INR" : "USD";
  return { symbol: composite, price, currency: ccy };
}

async function fetchOne(composite: string): Promise<Quote | null> {
  try {
    return await cached("td-quote", composite, 60_000, () => tdQuote(composite), {
      staleOnError: true
    });
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbols") || "").trim();
  if (!raw) return NextResponse.json({ quotes: [] });
  if (!KEY) {
    return NextResponse.json({
      quotes: [],
      error: "TWELVE_DATA_API_KEY not set in .env.local"
    });
  }
  const symbols = Array.from(new Set(raw.split(",").map(s => s.trim()).filter(Boolean))).slice(0, 25);
  const results = await Promise.all(symbols.map(fetchOne));
  return NextResponse.json({ quotes: results.filter((q): q is Quote => q !== null) });
}
