import { NextResponse } from "next/server";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NS = "crypto-history";

type Range = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "3y" | "all";

type Pt = { t: number; c: number };

function daysFor(range: Range): string {
  switch (range) {
    case "1d":
      return "1";
    case "1w":
      return "7";
    case "1m":
      return "30";
    case "3m":
      return "90";
    case "6m":
      return "180";
    case "1y":
      return "365";
    case "3y":
      return "1095";
    case "all":
      return "max";
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

async function fetchCoin(id: string, range: Range): Promise<Pt[]> {
  const days = daysFor(range);
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}/market_chart?vs_currency=usd&days=${days}`;
  const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const j: any = await r.json();
  const prices: any[] = Array.isArray(j?.prices) ? j.prices : [];
  const out: Pt[] = [];
  for (const row of prices) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const t = Number(row[0]);
    const c = Number(row[1]);
    if (Number.isFinite(t) && Number.isFinite(c)) out.push({ t, c });
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("ids") || "").trim();
  const range = parseRange(searchParams.get("range"));
  if (!raw) return NextResponse.json({ series: {} });

  const ids = Array.from(
    new Set(raw.split(",").map(s => s.trim()).filter(Boolean))
  ).slice(0, 50);

  const ttl = ttlFor(range);
  const series: Record<string, Pt[]> = {};

  await Promise.all(
    ids.map(async id => {
      const key = `${range}|${id}`;
      try {
        const pts = await cached(NS, key, ttl, () => fetchCoin(id, range), {
          staleOnError: true
        });
        series[id] = pts;
      } catch {
        // Skip failed coins
      }
    })
  );

  return NextResponse.json({ series });
}
