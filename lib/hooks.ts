"use client";
import { useEffect, useRef, useState } from "react";
import type { Holding, Quote } from "./types";

const PRICE_REFRESH_MS = 60_000;
const FX_REFRESH_MS = 5 * 60_000;

export function useFx() {
  const [usdInr, setUsdInr] = useState<number>(83);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/fx", { cache: "no-store" });
        if (!r.ok) throw new Error("fx");
        const j = await r.json();
        if (!cancelled && typeof j.usdInr === "number") setUsdInr(j.usdInr);
      } catch {
        // keep last known
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, FX_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { usdInr, loading };
}

export function usePrices(holdings: Holding[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const sigRef = useRef("");

  const sig = holdings
    .map(h => `${h.type}:${h.symbol}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!sig) {
      setQuotes({});
      return;
    }
    sigRef.current = sig;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const stocks = holdings.filter(h => h.type !== "crypto").map(h => h.symbol);
        const cryptos = holdings.filter(h => h.type === "crypto").map(h => h.symbol);
        const [stockRes, cryptoRes] = await Promise.all([
          stocks.length
            ? fetch(`/api/quote?symbols=${encodeURIComponent(stocks.join(","))}`, {
                cache: "no-store"
              }).then(r => r.json())
            : Promise.resolve({ quotes: [] }),
          cryptos.length
            ? fetch(`/api/crypto-price?ids=${encodeURIComponent(cryptos.join(","))}`, {
                cache: "no-store"
              }).then(r => r.json())
            : Promise.resolve({ quotes: [] })
        ]);
        if (cancelled || sigRef.current !== sig) return;
        const map: Record<string, Quote> = {};
        for (const q of [...(stockRes.quotes || []), ...(cryptoRes.quotes || [])]) {
          map[q.symbol] = q;
        }
        setQuotes(map);
        setUpdatedAt(Date.now());
      } catch {
        // keep stale quotes
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, PRICE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { quotes, loading, updatedAt };
}

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
