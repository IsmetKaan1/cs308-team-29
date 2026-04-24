const { computeInvoiceTotals, DEFAULT_VAT_RATE } = require('../invoiceTotals');

describe('computeInvoiceTotals', () => {
  test('returns zeroes for missing or zero totalPrice', () => {
    expect(computeInvoiceTotals({ totalPrice: 0 })).toMatchObject({ subtotal: 0, vat: 0, total: 0 });
    expect(computeInvoiceTotals({})).toMatchObject({ subtotal: 0, vat: 0, total: 0 });
    expect(computeInvoiceTotals({ totalPrice: null })).toMatchObject({ subtotal: 0, vat: 0, total: 0 });
  });

  test('does not divide by zero when vatRate is 0', () => {
    const r = computeInvoiceTotals({ totalPrice: 100, vatRate: 0 });
    expect(r).toMatchObject({ subtotal: 100, vat: 0, total: 100 });
  });

  test('total equals the tax-inclusive input (customer pays what was charged)', () => {
    const r = computeInvoiceTotals({ totalPrice: 100 });
    expect(r.total).toBe(100);
  });

  test('subtotal + vat reconciles with total to 2 decimals', () => {
    for (const amount of [100, 199.99, 349.99, 1234.56, 0.99]) {
      const { subtotal, vat, total } = computeInvoiceTotals({ totalPrice: amount });
      expect(subtotal + vat).toBeCloseTo(total, 2);
    }
  });

  test('extracts 18% VAT from a 100 TRY inclusive price', () => {
    const r = computeInvoiceTotals({ totalPrice: 100 });
    expect(r.subtotal).toBeCloseTo(84.75, 2);
    expect(r.vat).toBeCloseTo(15.25, 2);
    expect(r.total).toBe(100);
  });

  test('does NOT add VAT on top (regression guard for the original bug)', () => {
    const r = computeInvoiceTotals({ totalPrice: 100 });
    expect(r.total).not.toBe(118);
  });

  test('exposes the default VAT rate', () => {
    expect(DEFAULT_VAT_RATE).toBe(0.18);
  });

  test('accepts a custom VAT rate', () => {
    const r = computeInvoiceTotals({ totalPrice: 120, vatRate: 0.2 });
    expect(r.total).toBe(120);
    expect(r.subtotal).toBeCloseTo(100, 2);
    expect(r.vat).toBeCloseTo(20, 2);
  });

  test('falls back to the default rate when vatRate is invalid', () => {
    const r = computeInvoiceTotals({ totalPrice: 100, vatRate: 'bogus' });
    expect(r.vatRate).toBe(DEFAULT_VAT_RATE);
    expect(r.total).toBe(100);
  });
});
