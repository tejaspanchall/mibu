"use client";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Currency, Holding, Income, Transaction, TxKind } from "./types";
import {
  getSupabase,
  supabaseConfigured,
  type HoldingRow,
  type IncomeRow,
  type TransactionRow
} from "./supabase";
import { recomputeHolding } from "./holdings";
import { readCache, writeCache } from "./local-cache";

const KEY_DISPLAY_CCY = "mibu:displayCcy:v1";
const KEY_HOLDINGS = "holdings:v1";
const KEY_INCOMES = "incomes:v1";

type HoldingsSnapshot = {
  holdings: Holding[];
  transactionsByHolding: Record<string, Transaction[]>;
};

export type Result = { ok: true } | { ok: false; error: string };

function rowToHolding(r: HoldingRow): Holding {
  const logo = r.type === "crypto" ? (r.logo ?? undefined) : undefined;
  return {
    id: r.id,
    type: r.type,
    symbol: r.symbol,
    ticker: r.ticker,
    name: r.name,
    logo,
    currency: r.currency,
    buyPriceCurrency: r.buy_price_currency,
    quantity: Number(r.quantity),
    buyPrice: Number(r.buy_price),
    createdAt: r.created_at
  };
}

function holdingToInsertRow(h: {
  type: Holding["type"];
  symbol: string;
  ticker: string;
  name: string;
  logo?: string;
  currency: Currency;
  buyPriceCurrency: Currency;
  quantity: number;
  buyPrice: number;
}) {
  return {
    type: h.type,
    symbol: h.symbol,
    ticker: h.ticker,
    name: h.name,
    logo: h.logo ?? null,
    currency: h.currency,
    buy_price_currency: h.buyPriceCurrency,
    quantity: h.quantity,
    buy_price: h.buyPrice
  };
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    holdingId: r.holding_id,
    kind: r.kind,
    quantity: Number(r.quantity),
    price: Number(r.price),
    currency: r.currency,
    fxUsdInr: r.fx_usd_inr != null ? Number(r.fx_usd_inr) : null,
    date: r.date,
    createdAt: r.created_at
  };
}

export type AddHoldingInput = {
  type: Holding["type"];
  symbol: string;
  ticker: string;
  name: string;
  logo?: string;
  currency: Currency;
  buyPriceCurrency: Currency;
  quantity: number;
  buyPrice: number;
  date: string;
};

export type AddTxInput = {
  kind: TxKind;
  quantity: number;
  price: number;
  currency: Currency;
  date: string;
};

export type EditTxInput = {
  kind: TxKind;
  quantity: number;
  price: number;
  currency: Currency;
  date: string;
};

export function useHoldings() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactionsByHolding, setTransactionsByHolding] = useState<
    Record<string, Transaction[]>
  >({});
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase not configured");
      setHydrated(true);
      return;
    }
    const [hRes, tRes] = await Promise.all([
      sb.from("holdings").select("*").order("created_at", { ascending: false }),
      sb.from("transactions").select("*").order("date", { ascending: false })
    ]);
    if (hRes.error) {
      setError(hRes.error.message);
      setHydrated(true);
      return;
    }
    if (tRes.error) {
      setError(tRes.error.message);
      setHydrated(true);
      return;
    }
    const hs = ((hRes.data || []) as HoldingRow[]).map(rowToHolding);
    const txs = ((tRes.data || []) as TransactionRow[]).map(rowToTransaction);
    const grouped: Record<string, Transaction[]> = {};
    for (const t of txs) {
      (grouped[t.holdingId] ||= []).push(t);
    }
    setError(null);
    setHoldings(hs);
    setTransactionsByHolding(grouped);
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const cached = readCache<HoldingsSnapshot>(KEY_HOLDINGS);
    if (cached?.holdings && cached?.transactionsByHolding) {
      setHoldings(cached.holdings);
      setTransactionsByHolding(cached.transactionsByHolding);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCache<HoldingsSnapshot>(KEY_HOLDINGS, { holdings, transactionsByHolding });
  }, [hydrated, holdings, transactionsByHolding]);

  const persistRecompute = useCallback(
    async (
      holdingId: string,
      txs: Transaction[],
      canonicalCcy: Currency,
      currentFx: number | null
    ): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };
      const totals = recomputeHolding(txs, canonicalCcy, currentFx);

      if (txs.length === 0) {
        const { error } = await sb.from("holdings").delete().eq("id", holdingId);
        if (error) return { ok: false, error: error.message };
        setHoldings(prev => prev.filter(h => h.id !== holdingId));
        setTransactionsByHolding(prev => {
          const { [holdingId]: _drop, ...rest } = prev;
          void _drop;
          return rest;
        });
        return { ok: true };
      }

      const { data, error } = await sb
        .from("holdings")
        .update({ quantity: totals.quantity, buy_price: totals.buyPrice })
        .eq("id", holdingId)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      if (data) {
        const next = rowToHolding(data as HoldingRow);
        setHoldings(prev => prev.map(h => (h.id === holdingId ? next : h)));
      }
      return { ok: true };
    },
    []
  );

  const addHoldingOrTx = useCallback(
    async (input: AddHoldingInput, fxUsdInr: number | null): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };

      const existing = holdings.find(
        h => h.type === input.type && h.symbol === input.symbol
      );

      if (existing) {
        const { data, error } = await sb
          .from("transactions")
          .insert({
            holding_id: existing.id,
            kind: "buy",
            quantity: input.quantity,
            price: input.buyPrice,
            currency: input.buyPriceCurrency,
            fx_usd_inr: fxUsdInr ?? null,
            date: input.date
          })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        const tx = rowToTransaction(data as TransactionRow);
        const nextTxs = [tx, ...(transactionsByHolding[existing.id] ?? [])];
        setTransactionsByHolding(prev => ({ ...prev, [existing.id]: nextTxs }));
        return persistRecompute(existing.id, nextTxs, existing.buyPriceCurrency, fxUsdInr);
      }

      const { data: hData, error: hErr } = await sb
        .from("holdings")
        .insert(
          holdingToInsertRow({
            type: input.type,
            symbol: input.symbol,
            ticker: input.ticker,
            name: input.name,
            logo: input.logo,
            currency: input.currency,
            buyPriceCurrency: input.buyPriceCurrency,
            quantity: input.quantity,
            buyPrice: input.buyPrice
          })
        )
        .select()
        .single();
      if (hErr) return { ok: false, error: hErr.message };
      const holding = rowToHolding(hData as HoldingRow);

      const { data: tData, error: tErr } = await sb
        .from("transactions")
        .insert({
          holding_id: holding.id,
          kind: "buy",
          quantity: input.quantity,
          price: input.buyPrice,
          currency: input.buyPriceCurrency,
          fx_usd_inr: fxUsdInr ?? null,
          date: input.date
        })
        .select()
        .single();
      if (tErr) return { ok: false, error: tErr.message };
      const tx = rowToTransaction(tData as TransactionRow);

      setHoldings(prev => [holding, ...prev]);
      setTransactionsByHolding(prev => ({ ...prev, [holding.id]: [tx] }));
      return { ok: true };
    },
    [holdings, transactionsByHolding, persistRecompute]
  );

  const addTransaction = useCallback(
    async (
      holdingId: string,
      input: AddTxInput,
      fxUsdInr: number | null
    ): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };
      const holding = holdings.find(h => h.id === holdingId);
      if (!holding) return { ok: false, error: "holding not found" };

      const { data, error } = await sb
        .from("transactions")
        .insert({
          holding_id: holdingId,
          kind: input.kind,
          quantity: input.quantity,
          price: input.price,
          currency: input.currency,
          fx_usd_inr: fxUsdInr ?? null,
          date: input.date
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      const tx = rowToTransaction(data as TransactionRow);
      const nextTxs = [tx, ...(transactionsByHolding[holdingId] ?? [])];
      setTransactionsByHolding(prev => ({ ...prev, [holdingId]: nextTxs }));
      return persistRecompute(holdingId, nextTxs, holding.buyPriceCurrency, fxUsdInr);
    },
    [holdings, transactionsByHolding, persistRecompute]
  );

  const updateTransaction = useCallback(
    async (
      txId: string,
      patch: EditTxInput,
      fxUsdInr: number | null
    ): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };

      const { data, error } = await sb
        .from("transactions")
        .update({
          kind: patch.kind,
          quantity: patch.quantity,
          price: patch.price,
          currency: patch.currency,
          date: patch.date
        })
        .eq("id", txId)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      const tx = rowToTransaction(data as TransactionRow);

      const holdingId = tx.holdingId;
      const holding = holdings.find(h => h.id === holdingId);
      if (!holding) return { ok: false, error: "holding not found" };

      const nextTxs = (transactionsByHolding[holdingId] ?? []).map(t =>
        t.id === txId ? tx : t
      );
      setTransactionsByHolding(prev => ({ ...prev, [holdingId]: nextTxs }));
      return persistRecompute(holdingId, nextTxs, holding.buyPriceCurrency, fxUsdInr);
    },
    [holdings, transactionsByHolding, persistRecompute]
  );

  const removeTransaction = useCallback(
    async (txId: string, fxUsdInr: number | null): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };

      let holdingId: string | null = null;
      for (const [hid, txs] of Object.entries(transactionsByHolding)) {
        if (txs.some(t => t.id === txId)) {
          holdingId = hid;
          break;
        }
      }
      if (!holdingId) return { ok: false, error: "transaction not found" };
      const holding = holdings.find(h => h.id === holdingId);
      if (!holding) return { ok: false, error: "holding not found" };

      const { error } = await sb.from("transactions").delete().eq("id", txId);
      if (error) return { ok: false, error: error.message };

      const nextTxs = (transactionsByHolding[holdingId] ?? []).filter(t => t.id !== txId);
      setTransactionsByHolding(prev => ({ ...prev, [holdingId!]: nextTxs }));
      return persistRecompute(holdingId, nextTxs, holding.buyPriceCurrency, fxUsdInr);
    },
    [holdings, transactionsByHolding, persistRecompute]
  );

  const setHoldingCurrency = useCallback(
    async (
      holdingId: string,
      buyPriceCurrency: Currency,
      fxUsdInr: number | null
    ): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };
      const txs = transactionsByHolding[holdingId] ?? [];
      const totals = recomputeHolding(txs, buyPriceCurrency, fxUsdInr);
      const { data, error } = await sb
        .from("holdings")
        .update({
          buy_price_currency: buyPriceCurrency,
          quantity: totals.quantity,
          buy_price: totals.buyPrice
        })
        .eq("id", holdingId)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      if (data) {
        const next = rowToHolding(data as HoldingRow);
        setHoldings(prev => prev.map(h => (h.id === holdingId ? next : h)));
      }
      return { ok: true };
    },
    [transactionsByHolding]
  );

  const remove = useCallback(async (id: string): Promise<Result> => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase not configured" };
    let snapshot: { holding: Holding; index: number; txs: Transaction[] } | null = null;
    setHoldings(prev => {
      const idx = prev.findIndex(h => h.id === id);
      if (idx < 0) return prev;
      snapshot = {
        holding: prev[idx],
        index: idx,
        txs: transactionsByHolding[id] ?? []
      };
      return prev.filter(h => h.id !== id);
    });
    setTransactionsByHolding(prev => {
      const { [id]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });
    const { error } = await sb.from("holdings").delete().eq("id", id);
    if (error && snapshot) {
      const snap = snapshot as { holding: Holding; index: number; txs: Transaction[] };
      setHoldings(prev => {
        const next = [...prev];
        next.splice(snap.index, 0, snap.holding);
        return next;
      });
      setTransactionsByHolding(prev => ({ ...prev, [id]: snap.txs }));
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [transactionsByHolding]);

  return {
    holdings,
    transactionsByHolding,
    addHoldingOrTx,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setHoldingCurrency,
    remove,
    hydrated,
    error,
    configured: supabaseConfigured()
  };
}

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

  useEffect(() => {
    const cached = readCache<Income[]>(KEY_INCOMES);
    if (Array.isArray(cached)) {
      setIncomes(cached);
      setHydrated(true);
    }
  }, []);

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
    setIncomes(((data || []) as IncomeRow[]).map(rowToIncome));
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hydrated) return;
    writeCache<Income[]>(KEY_INCOMES, incomes);
  }, [hydrated, incomes]);

  const add = useCallback(
    async (i: Omit<Income, "id" | "createdAt">): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };
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
      if (error) return { ok: false, error: error.message };
      if (data) setIncomes(prev => [rowToIncome(data as IncomeRow), ...prev]);
      return { ok: true };
    },
    []
  );

  const update = useCallback(
    async (id: string, patch: Partial<Income>): Promise<Result> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase not configured" };
      const dbPatch: Record<string, unknown> = {};
      if (patch.amount != null) dbPatch.amount = patch.amount;
      if (patch.currency != null) dbPatch.currency = patch.currency;
      if (patch.emoji != null) dbPatch.emoji = patch.emoji;
      if (patch.source != null) dbPatch.source = patch.source;
      if (patch.date != null) dbPatch.date = patch.date;
      const { data, error } = await sb
        .from("incomes")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      if (data) setIncomes(prev => prev.map(i => (i.id === id ? rowToIncome(data as IncomeRow) : i)));
      return { ok: true };
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<Result> => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase not configured" };
    let snapshot: { item: Income; index: number } | null = null;
    setIncomes(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx < 0) return prev;
      snapshot = { item: prev[idx], index: idx };
      return prev.filter(i => i.id !== id);
    });
    const { error } = await sb.from("incomes").delete().eq("id", id);
    if (error && snapshot) {
      const snap = snapshot as { item: Income; index: number };
      setIncomes(prev => {
        const next = [...prev];
        next.splice(snap.index, 0, snap.item);
        return next;
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  return {
    incomes,
    add,
    update,
    remove,
    hydrated,
    error,
    configured: supabaseConfigured()
  };
}

type DisplayCcyCtx = {
  ccy: Currency;
  set: (next: Currency) => void;
  hydrated: boolean;
};
const DisplayCurrencyContext = createContext<DisplayCcyCtx | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
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

  const value = useMemo(() => ({ ccy, set, hydrated }), [ccy, set, hydrated]);
  return createElement(DisplayCurrencyContext.Provider, { value }, children);
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error(
      "useDisplayCurrency must be used inside <DisplayCurrencyProvider>"
    );
  }
  return [ctx.ccy, ctx.set, ctx.hydrated] as const;
}
