const { validateOrderInput } = require('../validateOrder');

const validAddress = {
  fullName: 'Test User',
  address: '123 Demo St',
  city: 'Istanbul',
  postalCode: '34000',
  country: 'Turkey',
};

const validItem = { id: 'abc', quantity: 2 };

describe('validateOrderInput', () => {
  test('rejects when items is not an array', () => {
    const r = validateOrderInput({ items: 'nope', shippingAddress: validAddress });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/cart is empty/);
  });

  test('rejects when items array is empty', () => {
    const r = validateOrderInput({ items: [], shippingAddress: validAddress });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cart is empty/);
  });

  test('rejects when shippingAddress is missing', () => {
    const r = validateOrderInput({ items: [validItem] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/shipping address/i);
  });

  test('rejects when a required address field is missing', () => {
    const partial = { ...validAddress, city: '   ' };
    const r = validateOrderInput({ items: [validItem], shippingAddress: partial });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/city is required/);
  });

  test('rejects when item quantity is zero', () => {
    const r = validateOrderInput({
      items: [{ id: 'abc', quantity: 0 }],
      shippingAddress: validAddress,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quantities must be at least 1/);
  });

  test('rejects when item quantity is not an integer', () => {
    const r = validateOrderInput({
      items: [{ id: 'abc', quantity: 1.5 }],
      shippingAddress: validAddress,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quantities must be at least 1/);
  });

  test('rejects when an item has no product id', () => {
    const r = validateOrderInput({
      items: [{ quantity: 1 }],
      shippingAddress: validAddress,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/missing product information/);
  });

  test('accepts productId alias instead of id', () => {
    const r = validateOrderInput({
      items: [{ productId: 'xyz', quantity: 2 }],
      shippingAddress: validAddress,
    });
    expect(r.ok).toBe(true);
    expect(r.productIds).toEqual(['xyz']);
  });

  test('trims shipping address fields and dedupes product ids', () => {
    const r = validateOrderInput({
      items: [
        { id: 'a', quantity: 1 },
        { id: 'a', quantity: 3 },
        { id: 'b', quantity: 2 },
      ],
      shippingAddress: { ...validAddress, city: '  Istanbul  ' },
    });
    expect(r.ok).toBe(true);
    expect(r.cleanShippingAddress.city).toBe('Istanbul');
    expect(r.productIds.sort()).toEqual(['a', 'b']);
  });
});
