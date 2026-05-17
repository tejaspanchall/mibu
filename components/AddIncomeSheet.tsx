"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { CurrencyToggle } from "./CurrencyToggle";
import { todayIso } from "@/lib/format";
import type { Currency } from "@/lib/types";

type AddResult = { ok: true } | { ok: false; error: string };

const INPUT_CLS =
  "w-full bg-chip rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted outline-none border border-transparent focus:bg-paper focus:border-line focus:shadow-focus transition duration-200";

export function AddIncomeSheet({
  open,
  onClose,
  onAdd,
  defaultCurrency,
  defaultDate
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  defaultDate?: string;
  onAdd: (i: {
    amount: number;
    currency: Currency;
    emoji: string;
    source: string;
    date: string;
  }) => Promise<AddResult>;
}) {
  const [amount, setAmount] = useState("");
  const [emoji, setEmoji] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [ccy, setCcy] = useState<Currency>(defaultCurrency);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setEmoji("");
    setSource("");
    setDate(defaultDate ?? todayIso());
    setCcy(defaultCurrency);
    setSubmitting(false);
    setErr(null);
  }, [open, defaultCurrency, defaultDate]);

  const canSave = useMemo(() => {
    const a = parseFloat(amount);
    return (
      a > 0 &&
      source.trim().length > 0 &&
      emoji.trim().length > 0 &&
      !submitting
    );
  }, [amount, source, emoji, submitting]);

  const submit = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setErr(null);
    const result = await onAdd({
      amount: parseFloat(amount),
      currency: ccy,
      emoji,
      source: source.trim(),
      date
    });
    if (!result.ok) {
      setErr(result.error);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="add income">
      <div className="px-5 pb-6 space-y-4" onKeyDown={onKeyDown}>
        <AmountCard
          emoji={emoji}
          onEmojiChange={setEmoji}
          amount={amount}
          onAmountChange={setAmount}
          currency={ccy}
          onCurrencyChange={setCcy}
          autoFocus
        />

        <Field label="source">
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="salary, freelance, dividend…"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="date">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={INPUT_CLS}
          />
        </Field>

        {err && <ErrorBanner>{err}</ErrorBanner>}

        <button
          onClick={submit}
          disabled={!canSave}
          className="mt-2 w-full bg-ink text-paper rounded-2xl py-3.5 text-sm font-medium shadow-soft hover:shadow-pop active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition duration-200"
        >
          {submitting ? "saving…" : "add"}
        </button>
      </div>
    </Sheet>
  );
}

export function AmountCard({
  emoji,
  onEmojiChange,
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  autoFocus
}: {
  emoji: string;
  onEmojiChange: (e: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-paper px-5 py-5 focus-within:shadow-focus focus-within:border-ink/15 transition duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] tracking-wider text-muted">amount</div>
        <CurrencyToggle value={currency} onChange={onCurrencyChange} />
      </div>
      <div className="flex items-end gap-3">
        <input
          type="text"
          value={emoji}
          onChange={e => onEmojiChange(e.target.value)}
          onFocus={e => e.target.select()}
          placeholder="🙂"
          maxLength={8}
          aria-label="emoji"
          className="w-14 text-4xl leading-none bg-transparent text-center outline-none placeholder:opacity-25 cursor-pointer"
        />
        <input
          autoFocus={autoFocus}
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="0"
          className="flex-1 min-w-0 bg-transparent text-right text-4xl font-semibold tracking-tight tnum font-mono outline-none placeholder:text-muted/40"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-wider text-muted px-1">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
      {children}
    </p>
  );
}
