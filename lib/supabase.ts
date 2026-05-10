"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _ready: boolean | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (_ready === false) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    _ready = false;
    return null;
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  _ready = true;
  return _client;
}

export function supabaseConfigured(): boolean {
  return getSupabase() !== null;
}

export type HoldingRow = {
  id: string;
  type: "crypto" | "us" | "in";
  symbol: string;
  ticker: string;
  name: string;
  logo: string | null;
  currency: "USD" | "INR";
  quantity: number;
  buy_price: number;
  created_at: string;
};

export type IncomeRow = {
  id: string;
  amount: number;
  currency: "USD" | "INR";
  emoji: string;
  source: string;
  date: string;
  created_at: string;
};
