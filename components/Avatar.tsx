"use client";
import { useEffect, useState } from "react";
import { letterColor } from "@/lib/format";
import { syncLogoUrlFor } from "@/lib/logo";
import type { AssetType } from "@/lib/types";

const usLogoCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function fetchUsLogo(ticker: string): Promise<string | null> {
  const key = ticker.toUpperCase();
  if (usLogoCache.has(key)) return Promise.resolve(usLogoCache.get(key)!);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetch(`/api/logo?type=us&ticker=${encodeURIComponent(key)}`)
    .then(r => r.json())
    .then(j => {
      const url = typeof j?.url === "string" && j.url ? j.url : null;
      usLogoCache.set(key, url);
      return url;
    })
    .catch(() => {
      usLogoCache.set(key, null);
      return null;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export function Avatar({
  logo,
  type,
  ticker,
  seed,
  label,
  size = 36
}: {
  logo?: string;
  type?: AssetType;
  ticker?: string;
  seed: string;
  label: string;
  size?: number;
}) {
  const initial = logo ?? (type && ticker ? syncLogoUrlFor(type, ticker) : null);
  const [url, setUrl] = useState<string | null>(initial);

  useEffect(() => {
    setUrl(logo ?? (type && ticker ? syncLogoUrlFor(type, ticker) : null));
  }, [logo, type, ticker]);

  useEffect(() => {
    if (url) return;
    if (logo) return;
    if (type !== "us" || !ticker) return;
    let cancelled = false;
    fetchUsLogo(ticker).then(resolved => {
      if (!cancelled && resolved) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [url, logo, type, ticker]);

  if (url) {
    return (
      <img
        src={url}
        alt={label}
        width={size}
        height={size}
        className="rounded-full bg-chip object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
        onError={() => {
          if (type === "us" && ticker) usLogoCache.set(ticker.toUpperCase(), null);
          setUrl(null);
        }}
      />
    );
  }
  const letter = (label || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full grid place-items-center text-paper font-semibold"
      style={{
        width: size,
        height: size,
        background: letterColor(seed),
        fontSize: Math.round(size * 0.42)
      }}
      aria-label={label}
    >
      {letter}
    </div>
  );
}
