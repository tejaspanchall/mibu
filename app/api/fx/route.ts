import { NextResponse } from "next/server";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Source = { name: string; load: () => Promise<number> };

const SOURCES: Source[] = [
  {
    name: "frankfurter",
    load: async () => {
      const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!r.ok) throw new Error(`frankfurter ${r.status}`);
      const j: any = await r.json();
      const rate = j?.rates?.INR;
      if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) throw new Error("bad rate");
      return rate;
    }
  },
  {
    name: "open-er-api",
    load: async () => {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!r.ok) throw new Error(`open-er-api ${r.status}`);
      const j: any = await r.json();
      const rate = j?.rates?.INR;
      if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) throw new Error("bad rate");
      return rate;
    }
  },
  {
    name: "currency-api",
    load: async () => {
      const url =
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
      const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`currency-api ${r.status}`);
      const j: any = await r.json();
      const rate = j?.usd?.inr;
      if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) throw new Error("bad rate");
      return rate;
    }
  }
];

async function loadFx(): Promise<{ usdInr: number; source: string }> {
  const errors: string[] = [];
  for (const src of SOURCES) {
    try {
      const rate = await src.load();
      return { usdInr: rate, source: src.name };
    } catch (e: any) {
      errors.push(`${src.name}: ${e?.message || "fail"}`);
    }
  }
  throw new Error(errors.join(" | "));
}

export async function GET() {
  try {
    const fx = await cached("fx", "usd-inr", 5 * 60_000, loadFx, { staleOnError: true });
    return NextResponse.json({ ...fx, base: "USD" });
  } catch (e: any) {
    return NextResponse.json(
      { usdInr: null, base: "USD", error: e?.message || "fx failed" },
      { status: 503 }
    );
  }
}
