"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { Avatar } from "./Avatar";
import { CurrencyToggle } from "./CurrencyToggle";
import { useDebounced } from "@/lib/hooks";
import { useDisplayCurrency } from "@/lib/storage";
import { todayIso } from "@/lib/format";
import { readSearchCache, writeSearchCache } from "@/lib/local-cache";
import type { AssetType, Currency, SearchResult } from "@/lib/types";

const SEARCH_TTL_MS = 5 * 60_000;

type Tab = "stock" | "crypto";

const INPUT_CLS =
  "w-full bg-chip rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted outline-none border border-transparent focus:bg-paper focus:border-line focus:shadow-focus transition duration-200";

export function AddHoldingSheet({
  open,
  onClose,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (h: {
    type: AssetType;
    symbol: string;
    ticker: string;
    name: string;
    logo?: string;
    currency: Currency;
    buyPriceCurrency: Currency;
    quantity: number;
    buyPrice: number;
    date: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [displayCcy] = useDisplayCurrency();
  const [tab, setTab] = useState<Tab>("stock");
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [buyCcy, setBuyCcy] = useState<Currency>(displayCcy);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setPicked(null);
    setQty("");
    setPrice("");
    setBuyCcy(displayCcy);
    setErr(null);
    setSubmitting(false);
  }, [open, tab, displayCcy]);

  useEffect(() => {
    if (!open || picked) return;
    if (!debounced.trim()) {
      setResults([]);
      return;
    }

    const q = debounced.trim().toLowerCase();
    const bucket = tab === "stock" ? "searchStock:v1" : "searchCrypto:v1";
    const cached = readSearchCache<SearchResult[]>(bucket, q, SEARCH_TTL_MS);
    if (cached) {
      setResults(cached);
      setLoadingSearch(false);
      return;
    }

    let cancelled = false;
    setLoadingSearch(true);
    const url =
      tab === "stock"
        ? `/api/search?q=${encodeURIComponent(debounced)}`
        : `/api/crypto-search?q=${encodeURIComponent(debounced)}`;
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        const results: SearchResult[] = j.results || [];
        setResults(results);
        writeSearchCache(bucket, q, results);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSearch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open, tab, picked]);

  const canSave = useMemo(() => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    return !!picked && q > 0 && p > 0 && !submitting;
  }, [picked, qty, price, submitting]);

  const submit = async () => {
    if (!canSave || !picked) return;
    setSubmitting(true);
    setErr(null);

    try {
      const url =
        picked.type === "crypto"
          ? `/api/crypto-price?ids=${encodeURIComponent(picked.symbol)}`
          : `/api/quote?symbols=${encodeURIComponent(picked.symbol)}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j?.quotes || j.quotes.length === 0) {
        setErr("couldn't fetch live price for this symbol. try a different ticker or exchange.");
        setSubmitting(false);
        return;
      }
    } catch {
      setErr("couldn't reach the price service. check your connection.");
      setSubmitting(false);
      return;
    }

    const result = await onAdd({
      type: picked.type,
      symbol: picked.symbol,
      ticker: picked.ticker,
      name: picked.name,
      logo: picked.logo,
      currency: picked.currency,
      buyPriceCurrency: buyCcy,
      quantity: parseFloat(qty),
      buyPrice: parseFloat(price),
      date: todayIso()
    });
    if (!result.ok) {
      setErr(result.error);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="add holding">
      <div className="px-5 pb-6">
        {!picked && (
          <>
            <div className="inline-flex bg-chip rounded-full p-0.5 text-xs font-medium mb-4">
              {(["stock", "crypto"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full transition duration-200 ${
                    tab === t ? "bg-paper text-ink shadow-soft" : "text-muted hover:text-ink"
                  }`}
                >
                  {t === "stock" ? "stocks" : "crypto"}
                </button>
              ))}
            </div>
            <div className="relative">
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  tab === "stock"
                    ? "search ticker or company (e.g. AAPL, RELIANCE)"
                    : "search crypto (e.g. bitcoin)"
                }
                className={`${INPUT_CLS} pl-10`}
              />
            </div>
            <div className="mt-3 space-y-0.5 min-h-[160px]">
              {loadingSearch && <p className="text-xs text-muted px-3 py-2">searching…</p>}
              {!loadingSearch && debounced && results.length === 0 && (
                <p className="text-xs text-muted px-3 py-2">no results</p>
              )}
              {results.map(r => (
                <button
                  key={`${r.type}:${r.symbol}`}
                  onClick={() => setPicked(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-chip active:scale-[0.99] transition duration-150 text-left"
                >
                  <Avatar
                    logo={r.logo}
                    type={r.type}
                    ticker={r.ticker}
                    seed={r.symbol}
                    label={r.ticker}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate tracking-tight">{r.name}</div>
                    <div className="text-xs text-muted">
                      {r.ticker} ·{" "}
                      {r.type === "crypto"
                        ? "crypto"
                        : r.type === "in"
                        ? "NSE/BSE"
                        : "US"}{" "}
                      · {r.currency}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {picked && (
          <div onKeyDown={onKeyDown}>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-chip mb-5">
              <Avatar
                logo={picked.logo}
                type={picked.type}
                ticker={picked.ticker}
                seed={picked.symbol}
                label={picked.ticker}
                size={42}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate tracking-tight">{picked.name}</div>
                <div className="text-xs text-muted">
                  {picked.ticker} · {picked.currency}
                </div>
              </div>
              <button
                onClick={() => setPicked(null)}
                className="text-xs text-muted hover:text-ink px-3 py-1.5 rounded-full bg-paper transition"
              >
                change
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted px-1">i paid in</span>
              <CurrencyToggle value={buyCcy} onChange={setBuyCcy} />
            </div>

            <div className="space-y-3">
              <Field label="quantity">
                <input
                  type="number"
                  inputMode="decimal"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  className={`${INPUT_CLS} tnum`}
                />
              </Field>
              <Field label={`avg buy price (${buyCcy})`}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${INPUT_CLS} tnum`}
                />
              </Field>
            </div>

            {err && <ErrorBanner>{err}</ErrorBanner>}

            <button
              onClick={submit}
              disabled={!canSave}
              className="mt-5 w-full bg-ink text-paper rounded-2xl py-3.5 text-sm font-medium shadow-soft hover:shadow-pop active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition duration-200"
            >
              {submitting ? "saving…" : "add"}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-wider text-muted px-1">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
      {children}
    </p>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
