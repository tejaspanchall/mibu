"use client";
import { useCallback, useMemo, useState } from "react";
import { useDisplayCurrency, useIncomes } from "@/lib/storage";
import { useFx } from "@/lib/hooks";
import { convert, formatMoney, formatPercent, monthLabel } from "@/lib/format";
import { IncomeRow, IncomeRowSkeleton } from "@/components/IncomeRow";
import { AddIncomeSheet } from "@/components/AddIncomeSheet";
import { EditIncomeSheet } from "@/components/EditIncomeSheet";
import { useRegisterAdd } from "@/components/AppShell";
import { ListCard } from "@/components/ui/Cards";
import { IncomeHero } from "@/components/IncomeHero";

export default function IncomePage() {
  const { incomes, add, update, remove, hydrated, error } = useIncomes();
  const [displayCcy] = useDisplayCurrency();
  const { usdInr, error: fxError } = useFx();

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const openAdd = useCallback(() => setAddOpen(true), []);
  useRegisterAdd(openAdd);

  // Per-month totals across all incomes for stat lookups.
  const totalsByKey = useMemo(() => {
    const map = new Map<string, { total: number; any: boolean }>();
    for (const inc of incomes) {
      const v = convert(inc.amount, inc.currency, displayCcy, usdInr);
      const key = inc.date.slice(0, 7);
      const cur = map.get(key) ?? { total: 0, any: false };
      if (v != null) {
        cur.total += v;
        cur.any = true;
      }
      map.set(key, cur);
    }
    return map;
  }, [incomes, displayCcy, usdInr]);

  const selectedKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const prevDate = new Date(selectedYear, selectedMonth - 2, 15);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const selectedTotal = totalsByKey.get(selectedKey)?.total ?? 0;
  const prevTotal = totalsByKey.get(prevKey)?.total ?? 0;

  const ytdTotal = useMemo(() => {
    let sum = 0;
    const yearPrefix = `${selectedYear}-`;
    for (const [key, { total }] of totalsByKey) {
      if (!key.startsWith(yearPrefix)) continue;
      const m = parseInt(key.slice(5), 10);
      if (m <= selectedMonth) sum += total;
    }
    return sum;
  }, [totalsByKey, selectedYear, selectedMonth]);

  const momPct = prevTotal > 0 ? ((selectedTotal - prevTotal) / prevTotal) * 100 : null;

  const heroSub = (() => {
    if (momPct == null) return null;
    const positive = momPct >= 0;
    const prevLabel = monthLabel(`${prevKey}-15`);
    return (
      <span className={positive ? "text-positive" : "text-negative"}>
        {positive ? "↑ " : "↓ "}
        {formatPercent(momPct)}{" "}
        <span className="opacity-70">vs {prevLabel}</span>
      </span>
    );
  })();

  const selectedItems = useMemo(() => {
    return incomes
      .filter(i => i.date.slice(0, 7) === selectedKey)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [incomes, selectedKey]);

  const editing = useMemo(
    () => incomes.find(i => i.id === editId) || null,
    [editId, incomes]
  );

  const canGoNextMonth =
    selectedYear < currentYear ||
    (selectedYear === currentYear && selectedMonth < currentMonth);
  const canGoNextYear = selectedYear < currentYear;

  const onPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  const onNextMonth = () => {
    if (!canGoNextMonth) return;
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  const onPrevYear = () => setSelectedYear(selectedYear - 1);
  const onNextYear = () => {
    if (!canGoNextYear) return;
    const nextY = selectedYear + 1;
    if (nextY === currentYear && selectedMonth > currentMonth) {
      setSelectedYear(nextY);
      setSelectedMonth(currentMonth);
    } else {
      setSelectedYear(nextY);
    }
  };

  const defaultDateForAdd =
    selectedYear === currentYear && selectedMonth === currentMonth
      ? undefined
      : `${selectedKey}-15`;

  const selectedMonthLabel = monthLabel(`${selectedKey}-15`);

  const ytdLine = (
    <>
      {selectedYear} ytd <span className="opacity-70">·</span>{" "}
      {formatMoney(ytdTotal, displayCcy)}
    </>
  );

  return (
    <div className="space-y-3">
      <IncomeHero
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onPrevYear={onPrevYear}
        onNextYear={onNextYear}
        canGoNextMonth={canGoNextMonth}
        canGoNextYear={canGoNextYear}
        value={formatMoney(selectedTotal, displayCcy)}
        pnlSub={heroSub}
        extra={ytdLine}
      />

      {usdInr == null && fxError && (
        <div className="text-[11px] text-muted px-1">
          fx unavailable — totals shown only for {displayCcy.toLowerCase()}
        </div>
      )}

      {error && (
        <div className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
          {error}
        </div>
      )}

      {!hydrated && (
        <ListCard>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <IncomeRowSkeleton />
              {i < 3 && <Divider />}
            </div>
          ))}
        </ListCard>
      )}

      {hydrated && incomes.length === 0 && !error && (
        <Empty icon="💰" title="no income yet" hint="tap the + button to log income" />
      )}

      {hydrated && incomes.length > 0 && (
        <ListCard>
          {selectedItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted">
              no income in {selectedMonthLabel}
            </div>
          ) : (
            selectedItems.map((inc, i) => (
              <div key={inc.id}>
                <IncomeRow
                  income={inc}
                  displayCurrency={displayCcy}
                  fxUsdInr={usdInr}
                  onClick={() => setEditId(inc.id)}
                />
                {i < selectedItems.length - 1 && <Divider />}
              </div>
            ))
          )}
        </ListCard>
      )}

      <AddIncomeSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={add}
        defaultCurrency={displayCcy}
        defaultDate={defaultDateForAdd}
      />

      <EditIncomeSheet
        open={!!editing}
        income={editing}
        onClose={() => setEditId(null)}
        onSave={update}
        onDelete={remove}
      />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line/70 mx-4" aria-hidden />;
}

function Empty({
  icon,
  title,
  hint
}: {
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mt-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-chip grid place-items-center text-2xl">
        {icon}
      </div>
      <div className="mt-4 text-sm font-medium tracking-tight">{title}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}
