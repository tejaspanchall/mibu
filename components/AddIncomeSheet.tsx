"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { EmojiPicker } from "./EmojiPicker";
import { CurrencyToggle } from "./CurrencyToggle";
import { todayIso } from "@/lib/format";
import type { Currency } from "@/lib/types";

export function AddIncomeSheet({
  open,
  onClose,
  onAdd,
  defaultCurrency
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onAdd: (i: {
    amount: number;
    currency: Currency;
    emoji: string;
    source: string;
    date: string;
  }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [emoji, setEmoji] = useState("💰");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(todayIso());
  const [ccy, setCcy] = useState<Currency>(defaultCurrency);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setEmoji("💰");
    setSource("");
    setDate(todayIso());
    setCcy(defaultCurrency);
  }, [open, defaultCurrency]);

  const canSave = useMemo(() => {
    const a = parseFloat(amount);
    return a > 0 && source.trim().length > 0;
  }, [amount, source]);

  const submit = () => {
    if (!canSave) return;
    onAdd({
      amount: parseFloat(amount),
      currency: ccy,
      emoji,
      source: source.trim(),
      date
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="add income">
      <div className="px-5 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted px-1">currency</span>
          <CurrencyToggle value={ccy} onChange={setCcy} />
        </div>

        <div className="text-center py-2">
          <div className="text-5xl mb-1">{emoji}</div>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full text-center bg-transparent text-3xl font-semibold outline-none"
          />
        </div>

        <Field label="source">
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="salary, freelance, dividend…"
            className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
          />
        </Field>

        <Field label="date">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none"
          />
        </Field>

        <Field label="emoji">
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </Field>

        <button
          onClick={submit}
          disabled={!canSave}
          className="mt-2 w-full bg-ink text-paper rounded-2xl py-3.5 text-sm font-medium disabled:opacity-30"
        >
          add
        </button>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted px-1">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
