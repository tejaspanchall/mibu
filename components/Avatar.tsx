"use client";
import { useEffect, useState } from "react";
import { letterColor } from "@/lib/format";
import { syncLogoUrlFor } from "@/lib/logo";
import type { AssetType } from "@/lib/types";

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
  const resolved = logo ?? (type && ticker ? syncLogoUrlFor(type, ticker) : null);
  const [url, setUrl] = useState<string | null>(resolved);

  useEffect(() => {
    setUrl(logo ?? (type && ticker ? syncLogoUrlFor(type, ticker) : null));
  }, [logo, type, ticker]);

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
        onError={() => setUrl(null)}
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
