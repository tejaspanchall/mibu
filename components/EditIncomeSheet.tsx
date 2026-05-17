"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { AmountCard } from "./AddIncomeSheet";
import { DeleteConfirm } from "./EditHoldingSheet";
import type { Currency, Income } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

const INPUT_CLS =
  "w-full bg-chip rounded-2xl px-4 py-3.5 text-sm outline-none border border-transparent focus:bg-paper focus:border-line focus:shadow-focus transition duration-200";

export function EditIncomeSheet({
  open,
  income,
  onClose,
  onSave,
  onDelete
}: {
  open: boolean;
  income: Income | null;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { amount: number; currency: Currency; emoji: string; source: string; date: string }
  ) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const [amount, setAmount] = useState("");
  const [emoji, setEmoji] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState("");
  const [ccy, setCcy] = useState<Currency>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !income) return;
    setAmount(String(income.amount));
    setEmoji(income.emoji);
    setSource(income.source);
    setDate(income.date);
    setCcy(income.currency);
    setSubmitting(false);
    setConfirmDel(false);
    setErr(null);
  }, [open, income]);

  const canSave = useMemo(() => {
    const a = parseFloat(amount);
    return (
      !!income &&
      a > 0 &&
      source.trim().length > 0 &&
      emoji.trim().length > 0 &&
      !submitting
    );
  }, [income, amount, source, emoji, submitting]);

  const submit = async () => {
    if (!income || !canSave) return;
    setSubmitting(true);
    setErr(null);
    const r = await onSave(income.id, {
      amount: parseFloat(amount),
      currency: ccy,
      emoji,
      source: source.trim(),
      date
    });
    if (!r.ok) {
      setErr(r.error);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  };

  const del = async () => {
    if (!income) return;
    setSubmitting(true);
    setErr(null);
    const r = await onDelete(income.id);
    if (!r.ok) {
      setErr(r.error);
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

  if (!income) return null;

  return (
    <Sheet open={open} onClose={onClose} title="edit income">
      <div className="px-5 pb-6 space-y-4" onKeyDown={onKeyDown}>
        <AmountCard
          emoji={emoji}
          onEmojiChange={setEmoji}
          amount={amount}
          onAmountChange={setAmount}
          currency={ccy}
          onCurrencyChange={setCcy}
        />

        <Field label="source">
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
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

        {err && (
          <p className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
            {err}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!canSave}
          className="mt-2 w-full bg-ink text-paper rounded-2xl py-3.5 text-sm font-medium shadow-soft hover:shadow-pop active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition duration-200"
        >
          {submitting ? "saving…" : "save"}
        </button>

        <DeleteConfirm
          armed={confirmDel}
          onArm={() => setConfirmDel(true)}
          onCancel={() => setConfirmDel(false)}
          onConfirm={del}
          disabled={submitting}
        />
      </div>
    </Sheet>
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
