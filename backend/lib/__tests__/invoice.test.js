const { generateInvoice, buildInvoiceNumber, formatCurrency } = require('../invoice');

const baseOrder = {
  _id: '000000000000000000abc123',
  createdAt: '2026-04-10T12:00:00.000Z',
  items: [
    { code: 'CS 308', name: 'Software Engineering', price: 100, quantity: 2 },
    { code: 'CS 300', name: 'Data Structures', price: 50, quantity: 1 },
  ],
  shippingAddress: { fullName: 'Test', address: 'a', city: 'c', postalCode: '1', country: 'TR' },
};

describe('invoice', () => {
  test('formatCurrency renders two decimals with ₺', () => {
    expect(formatCurrency(1)).toBe('1.00 ₺');
    expect(formatCurrency(199.9)).toBe('199.90 ₺');
  });

  test('buildInvoiceNumber encodes date + last 6 of id', () => {
    expect(buildInvoiceNumber(baseOrder)).toBe('INV-20260410-ABC123');
  });

  test('buildInvoiceNumber falls back to XXXXXX when id missing', () => {
    const n = buildInvoiceNumber({ createdAt: '2026-01-02T00:00:00Z' });
    expect(n).toBe('INV-20260102-XXXXXX');
  });

  test('generateInvoice returns one line per item with correct totals', () => {
    const inv = generateInvoice(baseOrder);
    expect(inv.lines).toHaveLength(2);
    expect(inv.lines[0]).toMatchObject({ code: 'CS 308', quantity: 2, unitPrice: 100, lineTotal: 200 });
    expect(inv.lines[1].lineTotal).toBe(50);
  });

  test('generateInvoice subtotal equals sum of line totals', () => {
    const inv = generateInvoice(baseOrder);
    expect(inv.subtotal).toBe(250);
    expect(inv.total).toBe(250);
    expect(inv.formattedTotal).toBe('250.00 ₺');
  });

  test('generateInvoice echoes shippingAddress and issuedAt', () => {
    const inv = generateInvoice(baseOrder);
    expect(inv.shippingAddress).toEqual(baseOrder.shippingAddress);
    expect(inv.issuedAt).toBe('2026-04-10T12:00:00.000Z');
  });

  test('generateInvoice throws when order is null', () => {
    expect(() => generateInvoice(null)).toThrow(/order is required/);
  });

  test('generateInvoice throws when items is empty', () => {
    expect(() => generateInvoice({ items: [] })).toThrow(/non-empty array/);
  });

  test('generateInvoice throws when items is missing', () => {
    expect(() => generateInvoice({})).toThrow(/non-empty array/);
  });
});
