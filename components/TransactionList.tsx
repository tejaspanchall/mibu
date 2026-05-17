"use client";
import { useEffect, useMemo, useState } from "react";
import { CurrencyToggle } from "./CurrencyToggle";
import { dayLabel, formatMoney, formatQuantity, todayIso } from "@/lib/format";
import type { AssetType, Currency, Transaction, TxKind } from "@/lib/types";

const INPUT_CLS =
  "w-full bg-chip rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:bg-paper focus:border-line focus:shadow-focus transition duration-200";

export type TxFormValues = {
  kind: TxKind;
  quantity: number;
  price: number;
  currency: Currency;
  date: string;
};

export function TransactionList({
  transactions,
  assetType,
  defaultCurrency,
  onAdd,
  onEdit,
  onDelete
}: {
  transactions: Transaction[];
  assetType: AssetType;
  defaultCurrency: Currency;
  onAdd: (input: TxFormValues) => Promise<{ ok: true } | { ok: false; error: string }>;
  onEdit: (
    txId: string,
    input: TxFormValues
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete: (txId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [openId, setOpenId] = useState<string | "new" | null>(null);

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions]
  );

  if (openId === "new") {
    return (
      <div className="rounded-2xl border border-line bg-paper overflow-hidden">
        <TxForm
          initial={{
            kind: "buy",
            quantity: 0,
            price: 0,
            currency: defaultCurrency,
            date: todayIso()
          }}
          assetType={assetType}
          onCancel={() => setOpenId(null)}
          onSubmit={async values => {
            const r = await onAdd(values);
            if (r.ok) setOpenId(null);
            return r;
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] tracking-wider text-muted font-medium px-1 mb-2">
        transactions
      </div>
      <div className="rounded-2xl border border-line overflow-hidden bg-paper">
        {sorted.length === 0 && (
          <div className="px-4 py-5 text-center text-xs text-muted">
            no transactions yet
          </div>
        )}
        {sorted.map((t, i) => (
          <div key={t.id}>
            {openId === t.id ? (
              <TxForm
                initial={t}
                assetType={assetType}
                onCancel={() => setOpenId(null)}
                onSubmit={async values => {
                  const r = await onEdit(t.id, values);
                  if (r.ok) setOpenId(null);
                  return r;
                }}
                onDelete={async () => {
                  const r = await onDelete(t.id);
                  if (r.ok) setOpenId(null);
                  return r;
                }}
              />
            ) : (
              <TxRow tx={t} assetType={assetType} onClick={() => setOpenId(t.id)} />
            )}
            {i < sorted.length - 1 && <Divider />}
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpenId("new")}
        className="mt-3 w-full flex items-center justify-center gap-1.5 bg-chip text-ink rounded-2xl py-3 text-sm font-medium hover:bg-line/70 active:scale-[0.99] transition duration-200"
      >
        <PlusIcon /> add transaction
      </button>
    </div>
  );
}

function TxRow({
  tx,
  assetType,
  onClick
}: {
  tx: Transaction;
  assetType: AssetType;
  onClick: () => void;
}) {
  const isBuy = tx.kind === "buy";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-chip/60 active:bg-chip transition duration-150 text-left"
    >
      <span
        className={`text-[10px] tracking-wider font-semibold px-2 py-1 rounded-full shrink-0 ${
          isBuy ? "bg-ink text-paper" : "bg-chip text-ink"
        }`}
      >
        {tx.kind}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium tracking-tight tnum">
          {formatQuantity(tx.quantity, assetType)}{" "}
          <span className="text-muted font-normal">@</span>{" "}
          {formatMoney(tx.price, tx.currency)}
        </div>
        <div className="text-[11px] text-muted">{dayLabel(tx.date)}</div>
      </div>
      <ChevronIcon />
    </button>
  );
}

type TxFormInitial = TxFormValues | Transaction;

function TxForm({
  initial,
  assetType,
  onCancel,
  onSubmit,
  onDelete
}: {
  initial: TxFormInitial;
  assetType: AssetType;
  onCancel: () => void;
  onSubmit: (
    values: TxFormValues
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete?: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [kind, setKind] = useState<TxKind>(initial.kind);
  const [qty, setQty] = useState(initial.quantity > 0 ? String(initial.quantity) : "");
  const [price, setPrice] = useState(initial.price > 0 ? String(initial.price) : "");
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [date, setDate] = useState(initial.date);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const canSave = useMemo(() => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    return q > 0 && p > 0 && date.length > 0 && !busy;
  }, [qty, price, date, busy]);

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    setErr(null);
    const r = await onSubmit({
      kind,
      quantity: parseFloat(qty),
      price: parseFloat(price),
      currency,
      date
    });
    setBusy(false);
    if (!r.ok) setErr(r.error);
  };

  const del = async () => {
    if (!onDelete) return;
    setBusy(true);
    setErr(null);
    const r = await onDelete();
    setBusy(false);
    if (!r.ok) setErr(r.error);
  };

  return (
    <div className="p-4 bg-chip/40 space-y-3">
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-paper rounded-full p-0.5 text-[11px] font-medium">
          {(["buy", "sell"] as TxKind[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-full transition duration-200 ${
                kind === k ? "bg-ink text-paper shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] tracking-wider text-muted px-1">qty</span>
          <input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="0"
            className={`${INPUT_CLS} mt-1 tnum`}
          />
        </label>
        <label className="block">
          <span className="text-[10px] tracking-wider text-muted px-1">
            price ({currency})
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            className={`${INPUT_CLS} mt-1 tnum`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] tracking-wider text-muted px-1">date</span>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={`${INPUT_CLS} mt-1`}
        />
      </label>

      {err && (
        <p className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3 py-2 leading-relaxed">
          {err}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2.5 rounded-full text-xs font-medium text-muted hover:text-ink transition"
        >
          cancel
        </button>
        <div className="flex-1" />
        {onDelete && !confirmDel && (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            disabled={busy}
            className="px-4 py-2.5 rounded-full text-xs font-medium text-negative hover:bg-negative/[0.06] transition"
          >
            delete
          </button>
        )}
        {onDelete && confirmDel && (
          <button
            type="button"
            onClick={del}
            disabled={busy}
            className="px-4 py-2.5 rounded-full text-xs font-medium bg-negative text-paper shadow-soft active:scale-95 transition"
          >
            confirm delete
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="px-4 py-2.5 rounded-full text-xs font-medium bg-ink text-paper shadow-soft hover:shadow-pop active:scale-[0.97] disabled:opacity-30 disabled:shadow-none transition duration-200"
        >
          {busy ? "…" : "save"}
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line/70 mx-4" aria-hidden />;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export type { Transaction };
