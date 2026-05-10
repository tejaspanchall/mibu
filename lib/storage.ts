"use client";
import { useCallback, useEffect, useState } from "react";
import type { Currency, Holding, Income } from "./types";
import { getSupabase, supabaseConfigured, type HoldingRow, type IncomeRow } from "./supabase";

const KEY_DISPLAY_CCY = "mibu:displayCcy:v1";

// ---------- holdings ----------

function rowToHolding(r: HoldingRow): Holding {
  return {
    id: r.id,
    type: r.type,
    symbol: r.symbol,
    ticker: r.ticker,
    name: r.name,
    logo: r.logo ?? undefined,
    currency: r.currency,
    quantity: Number(r.quantity),
    buyPrice: Number(r.buy_price),
    createdAt: r.created_at
  };
}

export function useHoldings() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase not configured");
      setHydrated(true);
      return;
    }
    const { data, error } = await sb
      .from("holdings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setHydrated(true);
      return;
    }
    setError(null);
    setHoldings((data || []).map(rowToHolding));
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (h: Omit<Holding, "id" | "createdAt">) => {
      const sb = getSupabase();
      if (!sb) return;
      const { data, error } = await sb
        .from("holdings")
        .insert({
          type: h.type,
          symbol: h.symbol,
          ticker: h.ticker,
          name: h.name,
          logo: h.logo ?? null,
          currency: h.currency,
          quantity: h.quantity,
          buy_price: h.buyPrice
        })
        .select()
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      if (data) setHoldings(prev => [rowToHolding(data as HoldingRow), ...prev]);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const prev = holdings;
    setHoldings(p => p.filter(h => h.id !== id));
    const { error } = await sb.from("holdings").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setHoldings(prev);
    }
  }, [holdings]);

  return { holdings, add, remove, hydrated, error, configured: supabaseConfigured() };
}

// ---------- incomes ----------

function rowToIncome(r: IncomeRow): Income {
  return {
    id: r.id,
    amount: Number(r.amount),
    currency: r.currency,
    emoji: r.emoji,
    source: r.source,
    date: r.date,
    createdAt: r.created_at
  };
}

export function useIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase not configured");
      setHydrated(true);
      return;
    }
    const { data, error } = await sb
      .from("incomes")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setHydrated(true);
      return;
    }
    setError(null);
    setIncomes((data || []).map(rowToIncome));
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (i: Omit<Income, "id" | "createdAt">) => {
      const sb = getSupabase();
      if (!sb) return;
      const { data, error } = await sb
        .from("incomes")
        .insert({
          amount: i.amount,
          currency: i.currency,
          emoji: i.emoji,
          source: i.source,
          date: i.date
        })
        .select()
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      if (data) setIncomes(prev => [rowToIncome(data as IncomeRow), ...prev]);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const prev = incomes;
    setIncomes(p => p.filter(i => i.id !== id));
    const { error } = await sb.from("incomes").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setIncomes(prev);
    }
  }, [incomes]);

  return { incomes, add, remove, hydrated, error, configured: supabaseConfigured() };
}

// ---------- display currency (kept in localStorage; UI-only state) ----------

export function useDisplayCurrency() {
  const [ccy, setCcy] = useState<Currency>("USD");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY_DISPLAY_CCY);
      if (raw === "USD" || raw === "INR") setCcy(raw);
    } catch {}
    setHydrated(true);
  }, []);

  const set = useCallback((next: Currency) => {
    setCcy(next);
    try {
      window.localStorage.setItem(KEY_DISPLAY_CCY, next);
    } catch {}
  }, []);

  return [ccy, set, hydrated] as const;
}
