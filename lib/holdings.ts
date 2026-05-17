import type { Currency, Transaction } from "./types";
import { convert } from "./format";

export type HoldingTotals = { quantity: number; buyPrice: number };

export function recomputeHolding(
  txs: Transaction[],
  canonicalCcy: Currency,
  currentFx: number | null
): HoldingTotals {
  let totalBuyQty = 0;
  let totalSellQty = 0;
  let weightedCost = 0;

  for (const t of txs) {
    if (t.kind === "sell") {
      totalSellQty += t.quantity;
      continue;
    }
    totalBuyQty += t.quantity;
    const fx = t.fxUsdInr ?? currentFx;
    const converted = convert(t.price, t.currency, canonicalCcy, fx);
    if (converted == null) continue;
    weightedCost += t.quantity * converted;
  }

  const quantity = Math.max(0, totalBuyQty - totalSellQty);
  const buyPrice = totalBuyQty > 0 ? weightedCost / totalBuyQty : 0;
  return { quantity, buyPrice };
}
