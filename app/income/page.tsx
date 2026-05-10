"use client";
import { useCallback, useMemo, useState } from "react";
import { useDisplayCurrency, useIncomes } from "@/lib/storage";
import { useFx } from "@/lib/hooks";
import { convert, formatMoney, monthLabel } from "@/lib/format";
import { IncomeRow } from "@/components/IncomeRow";
import { AddIncomeSheet } from "@/components/AddIncomeSheet";
import { ConfirmDelete } from "@/components/ConfirmRow";
import { useRegisterAdd } from "@/components/AppShell";

export default function IncomePage() {
  const { incomes, add, remove, hydrated, error } = useIncomes();
  const [displayCcy] = useDisplayCurrency();
  const { usdInr } = useFx();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  useRegisterAdd(openSheet);

  const sorted = useMemo(
    () => [...incomes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [incomes]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const inc of sorted) {
      const key = inc.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inc);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: monthLabel(`${key}-15`),
      total: items.reduce(
        (s, i) => s + convert(i.amount, i.currency, displayCcy, usdInr),
        0
      ),
      items
    }));
  }, [sorted, displayCcy, usdInr]);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = useMemo(
    () => groups.find(g => g.key === thisMonthKey)?.total ?? 0,
    [groups, thisMonthKey]
  );

  const confirming = useMemo(() => incomes.find(i => i.id === confirmId) || null, [confirmId, incomes]);

  return (
    <div className="px-5 lg:px-0 pt-2 lg:pt-0">
      <div className="text-center mb-2 lg:mb-4">
        <div className="text-xs text-muted lowercase">this month</div>
        <div className="text-[44px] lg:text-[64px] leading-none font-semibold tracking-tight mt-1">
          {formatMoney(thisMonthTotal, displayCcy, { compact: true })}
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <div className="text-xs text-negative bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {hydrated && incomes.length === 0 && !error && <Empty title="no income yet" hint="tap + to log income" />}

        {groups.map(g => (
          <section key={g.key} className="mt-5">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <div className="text-xs text-muted lowercase">{g.label}</div>
              <div className="text-xs font-medium">{formatMoney(g.total, displayCcy)}</div>
            </div>
            <div className="space-y-0.5">
              {g.items.map(inc => (
                <IncomeRow
                  key={inc.id}
                  income={inc}
                  displayCurrency={displayCcy}
                  fxUsdInr={usdInr}
                  onClick={() => setConfirmId(inc.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <AddIncomeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={add}
        defaultCurrency={displayCcy}
      />

      <ConfirmDelete
        open={!!confirming}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirming && remove(confirming.id)}
        title="delete income?"
        description={confirming ? `${confirming.emoji} ${confirming.source}` : undefined}
      />
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mt-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}
