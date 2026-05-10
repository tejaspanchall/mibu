"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { Avatar } from "./Avatar";
import { useDebounced } from "@/lib/hooks";
import type { AssetType, SearchResult } from "@/lib/types";

type Tab = "stock" | "crypto";

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
    currency: "USD" | "INR";
    quantity: number;
    buyPrice: number;
  }) => void;
}) {
  const [tab, setTab] = useState<Tab>("stock");
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setPicked(null);
    setQty("");
    setPrice("");
  }, [open, tab]);

  useEffect(() => {
    if (!open || picked) return;
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const url = tab === "stock" ? `/api/search?q=${encodeURIComponent(debounced)}` : `/api/crypto-search?q=${encodeURIComponent(debounced)}`;
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (!cancelled) setResults(j.results || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open, tab, picked]);

  const canSave = useMemo(() => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    return picked && q > 0 && p > 0;
  }, [picked, qty, price]);

  const submit = () => {
    if (!canSave || !picked) return;
    onAdd({
      type: picked.type,
      symbol: picked.symbol,
      ticker: picked.ticker,
      name: picked.name,
      logo: picked.logo,
      currency: picked.currency,
      quantity: parseFloat(qty),
      buyPrice: parseFloat(price)
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="add holding">
      <div className="px-5 pb-6">
        {!picked && (
          <>
            <div className="inline-flex bg-chip rounded-full p-0.5 text-xs font-medium mb-3">
              {(["stock", "crypto"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full transition ${
                    tab === t ? "bg-paper text-ink shadow-sm" : "text-muted"
                  }`}
                >
                  {t === "stock" ? "stocks" : "crypto"}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={tab === "stock" ? "search ticker or company (e.g. AAPL, RELIANCE)" : "search crypto (e.g. bitcoin)"}
                className="w-full bg-chip rounded-2xl px-4 py-3 text-sm placeholder:text-muted outline-none"
              />
            </div>
            <div className="mt-3 space-y-1 min-h-[160px]">
              {loading && <p className="text-xs text-muted px-2">searching…</p>}
              {!loading && debounced && results.length === 0 && (
                <p className="text-xs text-muted px-2">no results</p>
              )}
              {results.map(r => (
                <button
                  key={`${r.type}:${r.symbol}`}
                  onClick={() => setPicked(r)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-chip text-left"
                >
                  <Avatar logo={r.logo} seed={r.symbol} label={r.ticker} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted">
                      {r.ticker} · {r.type === "crypto" ? "crypto" : r.type === "in" ? "NSE/BSE" : "US"} · {r.currency}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {picked && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-chip mb-4">
              <Avatar logo={picked.logo} seed={picked.symbol} label={picked.ticker} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{picked.name}</div>
                <div className="text-xs text-muted">
                  {picked.ticker} · {picked.currency}
                </div>
              </div>
              <button onClick={() => setPicked(null)} className="text-xs text-muted px-2">
                change
              </button>
            </div>
            <div className="space-y-3">
              <Field label="quantity">
                <input
                  type="number"
                  inputMode="decimal"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </Field>
              <Field label={`avg buy price (${picked.currency})`}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </Field>
            </div>
            <button
              onClick={submit}
              disabled={!canSave}
              className="mt-5 w-full bg-ink text-paper rounded-2xl py-3.5 text-sm font-medium disabled:opacity-30"
            >
              add
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted px-1">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
