import { NextResponse } from "next/server";
import { cached } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadFx(): Promise<{ usdInr: number; date?: string }> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (r.ok) {
      const j: any = await r.json();
      const rate = j?.rates?.INR;
      if (typeof rate === "number") return { usdInr: rate, date: j.date };
    }
  } catch {}
  const r2 = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  const j2: any = await r2.json();
  const rate2 = j2?.rates?.INR;
  if (typeof rate2 !== "number") throw new Error("fx unavailable");
  return { usdInr: rate2 };
}

export async function GET() {
  try {
    const fx = await cached("fx", "usd-inr", 5 * 60_000, loadFx, { staleOnError: true });
    return NextResponse.json({ ...fx, base: "USD" });
  } catch (e: any) {
    return NextResponse.json({ usdInr: 83, base: "USD", error: e?.message || "fx failed" });
  }
}
