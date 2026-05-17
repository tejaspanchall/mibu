import { NextResponse } from "next/server";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.TWELVE_DATA_API_KEY;
const TTL = 30 * 24 * 60 * 60_000; // 30 days — logos rarely change

// Resolve a US ticker to its Twelve Data logo URL via the /logo endpoint.
// Free tier is allowed for US tickers; IN requires Grow plan and is handled
// elsewhere (EODHD CDN, deterministic).
async function resolveUsLogo(ticker: string): Promise<string | null> {
  if (!KEY) return null;
  const url = `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(
    ticker
  )}&apikey=${KEY}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j: any = await r.json();
  if (j?.status === "error" || j?.code) return null;
  const out = typeof j?.url === "string" ? j.url : null;
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").trim();
  const ticker = (searchParams.get("ticker") || "").trim().toUpperCase();
  if (!ticker) return NextResponse.json({ url: null });

  if (type === "us") {
    try {
      const url = await cached(
        "logo-us",
        ticker,
        TTL,
        () => resolveUsLogo(ticker),
        { staleOnError: true }
      );
      return NextResponse.json({ url });
    } catch {
      return NextResponse.json({ url: null });
    }
  }

  // IN and crypto don't need a server lookup; client derives sync.
  return NextResponse.json({ url: null });
}
