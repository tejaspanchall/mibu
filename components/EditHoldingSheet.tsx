"use client";
import { useState } from "react";
import { Sheet } from "./Sheet";
import { Avatar } from "./Avatar";
import { CurrencyToggle } from "./CurrencyToggle";
import { TransactionList, type TxFormValues } from "./TransactionList";
import type { Currency, Holding, Transaction } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

export function EditHoldingSheet({
  open,
  holding,
  transactions,
  fxUsdInr,
  onClose,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onSetCurrency,
  onDelete
}: {
  open: boolean;
  holding: Holding | null;
  transactions: Transaction[];
  fxUsdInr: number | null;
  onClose: () => void;
  onAddTransaction: (
    holdingId: string,
    input: TxFormValues,
    fxUsdInr: number | null
  ) => Promise<Result>;
  onUpdateTransaction: (
    txId: string,
    patch: TxFormValues,
    fxUsdInr: number | null
  ) => Promise<Result>;
  onDeleteTransaction: (txId: string, fxUsdInr: number | null) => Promise<Result>;
  onSetCurrency: (
    holdingId: string,
    next: Currency,
    fxUsdInr: number | null
  ) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const del = async () => {
    if (!holding) return;
    setBusy(true);
    setErr(null);
    const r = await onDelete(holding.id);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setConfirmDel(false);
    onClose();
  };

  if (!holding) return null;

  return (
    <Sheet open={open} onClose={onClose} title="edit holding">
      <div className="px-5 pb-6 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-chip">
          <Avatar
            logo={holding.logo}
            type={holding.type}
            ticker={holding.ticker}
            seed={holding.symbol}
            label={holding.ticker}
            size={42}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate tracking-tight">{holding.name}</div>
            <div className="text-xs text-muted">
              {holding.ticker} · {holding.currency}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-wider text-muted">
            book value in
          </span>
          <CurrencyToggle
            value={holding.buyPriceCurrency}
            onChange={async next => {
              if (next === holding.buyPriceCurrency) return;
              setErr(null);
              const r = await onSetCurrency(holding.id, next, fxUsdInr);
              if (!r.ok) setErr(r.error);
            }}
          />
        </div>

        <TransactionList
          transactions={transactions}
          assetType={holding.type}
          defaultCurrency={holding.buyPriceCurrency}
          onAdd={input => onAddTransaction(holding.id, input, fxUsdInr)}
          onEdit={(txId, input) => onUpdateTransaction(txId, input, fxUsdInr)}
          onDelete={txId => onDeleteTransaction(txId, fxUsdInr)}
        />

        {err && (
          <p className="text-xs text-negative bg-negative/[0.06] border border-negative/15 rounded-2xl px-3.5 py-2.5 leading-relaxed">
            {err}
          </p>
        )}

        <div className="pt-2 border-t border-line/70">
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              disabled={busy}
              className="mt-3 w-full text-negative rounded-2xl py-3 text-sm font-medium hover:bg-negative/[0.06] transition duration-200 disabled:opacity-30"
            >
              delete holding
            </button>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-negative/[0.06] border border-negative/15">
              <span className="text-xs text-negative">
                delete this holding and all its transactions?
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setConfirmDel(false)}
                  disabled={busy}
                  className="text-xs text-muted hover:text-ink px-3 py-1.5 rounded-full transition"
                >
                  cancel
                </button>
                <button
                  onClick={del}
                  disabled={busy}
                  className="text-xs text-paper bg-negative px-3 py-1.5 rounded-full font-medium shadow-soft active:scale-95 transition disabled:opacity-50"
                >
                  delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// Re-export DeleteConfirm so other files that imported it from here keep working.
export function DeleteConfirm({
  armed,
  onArm,
  onCancel,
  onConfirm,
  disabled
}: {
  armed: boolean;
  onArm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  if (!armed) {
    return (
      <button
        onClick={onArm}
        disabled={disabled}
        className="mt-2 w-full text-negative rounded-2xl py-3 text-sm font-medium hover:bg-negative/[0.06] transition duration-200 disabled:opacity-30"
      >
        delete
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-negative/[0.06] border border-negative/15">
      <span className="text-xs text-negative">delete this?</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="text-xs text-muted hover:text-ink px-3 py-1.5 rounded-full transition"
        >
          cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="text-xs text-paper bg-negative px-3 py-1.5 rounded-full font-medium shadow-soft active:scale-95 transition disabled:opacity-50"
        >
          delete
        </button>
      </div>
    </div>
  );
}
