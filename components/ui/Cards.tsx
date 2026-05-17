import type { ReactNode } from "react";

export function HeroCard({
  label,
  value,
  sub,
  action
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-paper border border-line px-5 py-5 lg:px-7 lg:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] tracking-wider text-muted font-medium">
          {label}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-2 text-[44px] lg:text-[60px] leading-none font-semibold tracking-tighter tnum">
        {value}
      </div>
      {sub && <div className="mt-3 text-sm tnum">{sub}</div>}
    </div>
  );
}

export type StatTileData = { label: ReactNode; value: ReactNode; tone?: "default" | "positive" | "negative" };

export function StatStrip({ tiles }: { tiles: StatTileData[] }) {
  if (tiles.length === 0) return null;
  return (
    <div
      className="grid gap-2 mt-3"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((t, i) => (
        <StatTile key={i} {...t} />
      ))}
    </div>
  );
}

export function StatTile({ label, value, tone = "default" }: StatTileData) {
  const valueColor =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
      ? "text-negative"
      : "text-ink";
  return (
    <div className="bg-chip rounded-2xl px-3.5 py-3 min-w-0">
      <div className="text-[10px] tracking-wider text-muted font-medium truncate">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold tnum truncate ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

export function ListCard({
  header,
  children
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-paper border border-line overflow-hidden">
      {header && (
        <div className="border-b border-line/70">
          {header}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function SectionHeader({
  title,
  end,
  center
}: {
  title: ReactNode;
  end?: ReactNode;
  center?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="text-[13px] font-semibold tracking-tight lowercase">{title}</div>
      {center && <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">{center}</div>}
      {!center && <div className="flex-1" />}
      {end && <div className="shrink-0 text-xs text-muted tnum">{end}</div>}
    </div>
  );
}

export function RowDivider() {
  return <div className="h-px bg-line/70 mx-4" aria-hidden />;
}
