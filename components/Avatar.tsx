"use client";
import { letterColor } from "@/lib/format";

export function Avatar({
  logo,
  seed,
  label,
  size = 36
}: {
  logo?: string;
  seed: string;
  label: string;
  size?: number;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={label}
        width={size}
        height={size}
        className="rounded-full bg-chip object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
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
