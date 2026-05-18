"use client";

const PREFIX = "mibu:";

type Entry<T> = { v: T; t: number };

export function readCache<T>(key: string, maxAgeMs?: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.t !== "number") return null;
    if (maxAgeMs != null && Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ v: value, t: Date.now() })
    );
  } catch {}
}

const SEARCH_CAP = 50;

export function readSearchCache<T>(
  bucket: string,
  query: string,
  maxAgeMs: number
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + bucket);
    if (!raw) return null;
    const blob = JSON.parse(raw) as Record<string, Entry<T>>;
    const entry = blob?.[query];
    if (!entry || typeof entry.t !== "number") return null;
    if (Date.now() - entry.t > maxAgeMs) return null;
    return entry.v;
  } catch {
    return null;
  }
}

export function writeSearchCache<T>(
  bucket: string,
  query: string,
  value: T
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PREFIX + bucket);
    const blob = (raw ? JSON.parse(raw) : {}) as Record<string, Entry<T>>;
    blob[query] = { v: value, t: Date.now() };
    const keys = Object.keys(blob);
    if (keys.length > SEARCH_CAP) {
      keys.sort((a, b) => blob[a].t - blob[b].t);
      const excess = keys.length - SEARCH_CAP;
      for (let i = 0; i < excess; i++) {
        delete blob[keys[i]];
      }
    }
    window.localStorage.setItem(PREFIX + bucket, JSON.stringify(blob));
  } catch {}
}
