import { NextResponse } from "next/server";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;
const NS = "stock-history";

type Range = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "3y" | "all";

type Pt = { t: number; c: number };

function rangeParams(range: Range): { interval: string; outputsize: number } {
  switch (range) {
    case "1d":
      return { interval: "5min", outputsize: 80 };
    case "1w":
      return { interval: "30min", outputsize: 80 };
    case "1m":
      return { interval: "1day", outputsize: 31 };
    case "3m":
      return { interval: "1day", outputsize: 93 };
    case "6m":
      return { interval: "1day", outputsize: 186 };
    case "1y":
      return { interval: "1day", outputsize: 260 };
    case "3y":
      return { interval: "1week", outputsize: 160 };
    case "all":
      return { interval: "1week", outputsize: 520 };
  }
}

function ttlFor(range: Range): number {
  switch (range) {
    case "1d":
    case "1w":
      return 5 * 60_000;
    case "1m":
    case "3m":
      return 30 * 60_000;
    case "6m":
    case "1y":
    case "3y":
      return 6 * 60 * 60_000;
    case "all":
      return 24 * 60 * 60_000;
  }
}

function parseRange(s: string | null): Range {
  const ok: Range[] = ["1d", "1w", "1m", "3m", "6m", "1y", "3y", "all"];
  return (ok as string[]).includes(s ?? "") ? (s as Range) : "1m";
}

function parsePoints(values: any[]): Pt[] {
  const out: Pt[] = [];
  for (const v of values || []) {
    const dt = v?.datetime;
    const close = v?.close ?? v?.c;
    if (!dt || close == null) continue;
    const t = new Date(
      dt.includes(" ") ? dt.replace(" ", "T") + "Z" : dt + "T00:00:00Z"
    ).getTime();
    const c = typeof close === "string" ? parseFloat(close) : Number(close);
    if (Number.isFinite(t) && Number.isFinite(c)) out.push({ t, c });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

async function fetchExchange(
  exchange: string,
  tickers: string[],
  range: Range
): Promise<Record<string, Pt[]>> {
  if (!KEY) throw new Error("TWELVE_DATA_API_KEY not set");
  const { interval, outputsize } = rangeParams(range);
  const params = new URLSearchParams({
    symbol: tickers.join(","),
    interval,
    outputsize: String(outputsize),
    apikey: KEY,
    order: "ASC"
  });
  if (exchange) params.set("exchange", exchange);
  const url = `https://api.twelvedata.com/time_series?${params.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`twelvedata ${r.status}`);
  const j: any = await r.json();
  if (j?.status === "error" || j?.code) throw new Error(j?.message || "td error");

  const series: Record<string, Pt[]> = {};
  if (tickers.length === 1) {
    series[`${tickers[0]}:${exchange}`] = parsePoints(j?.values || []);
  } else {
    for (const ticker of tickers) {
      const entry = j?.[ticker];
      if (!entry) continue;
      if (entry?.status === "error") continue;
      series[`${ticker}:${exchange}`] = parsePoints(entry?.values || []);
    }
  }
  return series;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbols") || "").trim();
  const range = parseRange(searchParams.get("range"));
  if (!raw) return NextResponse.json({ series: {} });

  const symbols = Array.from(
    new Set(raw.split(",").map(s => s.trim()).filter(Boolean))
  ).slice(0, 50);

  const byExchange = new Map<string, string[]>();
  for (const composite of symbols) {
    const idx = composite.lastIndexOf(":");
    if (idx <= 0) continue;
    const ticker = composite.slice(0, idx);
    const exchange = composite.slice(idx + 1);
    if (!byExchange.has(exchange)) byExchange.set(exchange, []);
    byExchange.get(exchange)!.push(ticker);
  }

  const ttl = ttlFor(range);
  const series: Record<string, Pt[]> = {};

  await Promise.all(
    Array.from(byExchange.entries()).map(async ([exchange, tickers]) => {
      const key = `${range}|${exchange}|${tickers.slice().sort().join(",")}`;
      try {
        const got = await cached(NS, key, ttl, () => fetchExchange(exchange, tickers, range), {
          staleOnError: true
        });
        Object.assign(series, got);
      } catch {
      }
    })
  );

  return NextResponse.json({ series });
}
