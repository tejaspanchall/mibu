import { NextResponse } from "next/server";
import type { Quote, Currency } from "@/lib/types";
import { readFresh, readStale, write } from "@/lib/server-cache";
import { nseQuote } from "@/lib/nse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;
const TTL_TD = 60_000;
const TTL_NSE = 60_000;
const NS = "quote";

function parsePrice(j: any): number | null {
  const candidates = [j?.price, j?.close, j?.last];
  for (const v of candidates) {
    const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function inrFor(exchange: string, j: any): Currency {
  if (j?.currency === "INR") return "INR";
  if (exchange === "NSE" || exchange === "BSE") return "INR";
  return "USD";
}

function isNseExchange(ex: string): boolean {
  return ex === "NSE";
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function tdBatch(exchange: string, tickers: string[]): Promise<Quote[]> {
  if (!KEY) throw new Error("TWELVE_DATA_API_KEY not set");
  const params = new URLSearchParams({
    symbol: tickers.join(","),
    apikey: KEY
  });
  if (exchange) params.set("exchange", exchange);
  const url = `https://api.twelvedata.com/quote?${params.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`twelvedata ${r.status}`);
  const j: any = await r.json();
  if (j?.status === "error" || j?.code) throw new Error(j?.message || "td error");

  const out: Quote[] = [];
  if (tickers.length === 1) {
    const price = parsePrice(j);
    if (price != null) {
      out.push({
        symbol: `${tickers[0]}:${exchange}`,
        price,
        currency: inrFor(exchange, j)
      });
    }
  } else {
    for (const ticker of tickers) {
      const item = j?.[ticker];
      if (!item) continue;
      if (item.status === "error" || item.code) continue;
      const price = parsePrice(item);
      if (price == null) continue;
      out.push({
        symbol: `${ticker}:${exchange}`,
        price,
        currency: inrFor(exchange, item)
      });
    }
  }
  return out;
}

async function nseBatch(tickers: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const q = await nseQuote(ticker);
    if (q) {
      out.push({ symbol: `${ticker}:NSE`, price: q.price, currency: "INR" });
    }
    if (i < tickers.length - 1) await sleep(80);
  }
  return out;
}

async function fetchByExchange(exchange: string, tickers: string[]): Promise<Quote[]> {
  if (isNseExchange(exchange)) {
    return nseBatch(tickers);
  }
  return tdBatch(exchange, tickers);
}

function ttlFor(exchange: string): number {
  return isNseExchange(exchange) ? TTL_NSE : TTL_TD;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbols") || "").trim();
  if (!raw) return NextResponse.json({ quotes: [] });

  const symbols = Array.from(
    new Set(raw.split(",").map(s => s.trim()).filter(Boolean))
  ).slice(0, 50);

  const fresh: Quote[] = [];
  const missing: string[] = [];
  for (const composite of symbols) {
    const cached = readFresh<Quote>(NS, composite);
    if (cached) fresh.push(cached);
    else missing.push(composite);
  }

  const byExchange = new Map<string, string[]>();
  for (const composite of missing) {
    const idx = composite.lastIndexOf(":");
    if (idx <= 0) continue;
    const ticker = composite.slice(0, idx);
    const exchange = composite.slice(idx + 1);
    if (!byExchange.has(exchange)) byExchange.set(exchange, []);
    byExchange.get(exchange)!.push(ticker);
  }

  const fetched: Quote[] = [];
  await Promise.all(
    Array.from(byExchange.entries()).map(async ([exchange, tickers]) => {
      try {
        const quotes = await fetchByExchange(exchange, tickers);
        const ttl = ttlFor(exchange);
        for (const q of quotes) {
          write(NS, q.symbol, q, ttl);
          fetched.push(q);
        }
        const got = new Set(quotes.map(q => q.symbol));
        for (const ticker of tickers) {
          const composite = `${ticker}:${exchange}`;
          if (got.has(composite)) continue;
          const stale = readStale<Quote>(NS, composite);
          if (stale) fetched.push(stale);
        }
      } catch {
        for (const ticker of tickers) {
          const composite = `${ticker}:${exchange}`;
          const stale = readStale<Quote>(NS, composite);
          if (stale) fetched.push(stale);
        }
      }
    })
  );

  return NextResponse.json({ quotes: [...fresh, ...fetched] });
}
