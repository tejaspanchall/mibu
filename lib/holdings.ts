import type { Currency, Transaction } from "./types";
import { convert } from "./format";

export type HoldingTotals = { quantity: number; buyPrice: number };

// Compute a holding's cached quantity and weighted-average buy price from
// its transactions. Sells reduce the position but do not change avg cost.
// When transactions are in a different currency than canonicalCcy, prefer the
// FX rate captured at tx time (`tx.fxUsdInr`); fall back to the current rate.
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
