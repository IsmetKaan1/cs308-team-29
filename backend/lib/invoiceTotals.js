/**
 * Invoice total reconciliation.
 *
 * Storefront prices are VAT-inclusive — the number on the card is exactly
 * what the customer paid and what ends up in `order.totalPrice`. The
 * invoice must reconcile to that same figure, so VAT is *extracted* from
 * the inclusive total rather than *added on top* of it.
 *
 * Given a VAT-inclusive total T and a VAT rate r:
 *   subtotal = T / (1 + r)
 *   vat      = T - subtotal
 *   total    = T  // authoritative; what the user paid
 *
 * Rounding is applied only on output so subtotal + vat always equals
 * total to 2 decimals.
 */

const DEFAULT_VAT_RATE = 0.18;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function computeInvoiceTotals({ totalPrice, vatRate = DEFAULT_VAT_RATE } = {}) {
  const total = Number(totalPrice);
  if (!Number.isFinite(total) || total <= 0) {
    return { subtotal: 0, vat: 0, total: 0, vatRate };
  }

  const rate = Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : DEFAULT_VAT_RATE;
  const roundedTotal = round2(total);
  const subtotal = round2(roundedTotal / (1 + rate));
  // Derive VAT from the rounded figures so the three numbers always sum cleanly.
  const vat = round2(roundedTotal - subtotal);
  return { subtotal, vat, total: roundedTotal, vatRate: rate };
}

module.exports = { computeInvoiceTotals, DEFAULT_VAT_RATE };
