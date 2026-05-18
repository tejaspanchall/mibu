"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Currency, Holding, Quote } from "./types";
import { convert } from "./format";
import { readCache, writeCache } from "./local-cache";

const PRICE_REFRESH_MS = 60_000;
const FX_REFRESH_MS = 5 * 60_000;
const FX_HARD_MAX_AGE_MS = 24 * 60 * 60_000;
const FX_CACHE_KEY = "mibu:fx:v1";
const QUOTES_KEY = "quotes:v1";
const QUOTES_HARD_MAX_AGE_MS = 24 * 60 * 60_000;

type FxCache = { usdInr: number; fetchedAt: number };

function readCachedFx(): FxCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.usdInr !== "number" || parsed.usdInr <= 0) return null;
    if (typeof parsed?.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > FX_HARD_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedFx(usdInr: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FX_CACHE_KEY,
      JSON.stringify({ usdInr, fetchedAt: Date.now() })
    );
  } catch {}
}

export function useFx() {
  const [usdInr, setUsdInr] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const cached = readCachedFx();
    if (cached) setUsdInr(cached.usdInr);
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/fx", { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        if (typeof j?.usdInr === "number" && j.usdInr > 0) {
          setUsdInr(j.usdInr);
          setError(null);
          writeCachedFx(j.usdInr);
        } else {
          setError(j?.error || "fx unavailable");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "fx unavailable");
      }
    };
    load();
    const id = setInterval(load, FX_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { usdInr, error, hydrated };
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
    const cached = readCache<Record<string, Quote>>(QUOTES_KEY, QUOTES_HARD_MAX_AGE_MS);
    if (cached) setQuotes(cached);
  }, []);

  useEffect(() => {
    if (!sig) return;
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
        if (Object.keys(map).length === 0) return;
        setQuotes(prev => {
          const next = { ...prev, ...map };
          writeCache(QUOTES_KEY, next);
          return next;
        });
        setUpdatedAt(Date.now());
      } catch {
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
  }, [sig]);

  return { quotes, loading, updatedAt };
}

export type ChartRange = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "3y" | "all";
type RawPt = { t: number; c: number };

function historyTtl(range: ChartRange): number {
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

function historyKey(symbol: string, range: ChartRange): string {
  return `history:v1:${symbol}:${range}`;
}

function computeStartValue(
  seriesBySymbol: Record<string, RawPt[]>,
  holdings: Holding[],
  displayCcy: Currency,
  fxUsdInr: number | null
): number | null {
  let total = 0;
  let any = false;
  for (const h of holdings) {
    const pts = seriesBySymbol[h.symbol];
    if (!pts || pts.length === 0) continue;
    const startPrice = pts[0].c;
    const nativeValue = startPrice * h.quantity;
    const v = convert(nativeValue, h.currency, displayCcy, fxUsdInr);
    if (v == null) continue;
    total += v;
    any = true;
  }
  return any ? total : null;
}

export function usePortfolioStartValue(
  holdings: Holding[],
  displayCcy: Currency,
  fxUsdInr: number | null,
  range: ChartRange
) {
  const [startValue, setStartValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const sig = useMemo(
    () =>
      holdings
        .map(h => `${h.type}:${h.symbol}:${h.quantity}:${h.currency}`)
        .sort()
        .join("|"),
    [holdings]
  );

  const fxKey = fxUsdInr == null ? "none" : Math.round(fxUsdInr * 100) / 100;

  useEffect(() => {
    if (range === "all" || holdings.length === 0) {
      setStartValue(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ttl = historyTtl(range);

    const cachedBySymbol: Record<string, RawPt[]> = {};
    let allCached = true;
    for (const h of holdings) {
      const pts = readCache<RawPt[]>(historyKey(h.symbol, range), ttl);
      if (pts && pts.length > 0) cachedBySymbol[h.symbol] = pts;
      else allCached = false;
    }

    const hadCache = Object.keys(cachedBySymbol).length > 0;
    if (hadCache) {
      setStartValue(computeStartValue(cachedBySymbol, holdings, displayCcy, fxUsdInr));
    }

    if (allCached) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    const stocks = holdings.filter(h => h.type !== "crypto");
    const cryptos = holdings.filter(h => h.type === "crypto");

    const stockUrl = stocks.length
      ? `/api/stock-history?symbols=${encodeURIComponent(
          stocks.map(h => h.symbol).join(",")
        )}&range=${range}`
      : null;
    const cryptoUrl = cryptos.length
      ? `/api/crypto-history?ids=${encodeURIComponent(
          cryptos.map(h => h.symbol).join(",")
        )}&range=${range}`
      : null;

    Promise.all([
      stockUrl
        ? fetch(stockUrl, { cache: "no-store" }).then(r => r.json())
        : Promise.resolve({ series: {} }),
      cryptoUrl
        ? fetch(cryptoUrl, { cache: "no-store" }).then(r => r.json())
        : Promise.resolve({ series: {} })
    ])
      .then(([stockRes, cryptoRes]) => {
        if (cancelled) return;
        const seriesBySymbol: Record<string, RawPt[]> = {
          ...(stockRes?.series || {}),
          ...(cryptoRes?.series || {})
        };

        for (const [sym, pts] of Object.entries(seriesBySymbol)) {
          if (Array.isArray(pts) && pts.length > 0) {
            writeCache(historyKey(sym, range), pts);
          }
        }

        setStartValue(computeStartValue(seriesBySymbol, holdings, displayCcy, fxUsdInr));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (!hadCache) setStartValue(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sig, displayCcy, fxKey, range, holdings]);

  return { startValue, loading };
}

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function useTwelveDataConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        if (!cancelled) setConfigured(!!j?.twelveData);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return configured;
}
