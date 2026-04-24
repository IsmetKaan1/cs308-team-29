const { computeSalesCount, computeSalesMap } = require('../salesAggregate');

describe('computeSalesCount', () => {
  test('returns 0 for an empty or invalid input', () => {
    expect(computeSalesCount([], 'p1')).toBe(0);
    expect(computeSalesCount(null, 'p1')).toBe(0);
    expect(computeSalesCount(undefined, 'p1')).toBe(0);
    expect(computeSalesCount([{ items: [] }], null)).toBe(0);
  });

  test('sums quantities across orders for a single product', () => {
    const orders = [
      { items: [{ productId: 'p1', quantity: 2 }] },
      { items: [{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 5 }] },
    ];
    expect(computeSalesCount(orders, 'p1')).toBe(5);
    expect(computeSalesCount(orders, 'p2')).toBe(5);
  });

  test('ignores orders with no items array and malformed quantities', () => {
    const orders = [
      { items: null },
      {},
      { items: [{ productId: 'p1', quantity: 'three' }] },
      { items: [{ productId: 'p1', quantity: -4 }] },
      { items: [{ productId: 'p1', quantity: 2 }] },
    ];
    expect(computeSalesCount(orders, 'p1')).toBe(2);
  });

  test('string/ObjectId shaped ids are matched by stringification', () => {
    const orders = [{ items: [{ productId: { toString: () => 'abc' }, quantity: 7 }] }];
    expect(computeSalesCount(orders, 'abc')).toBe(7);
  });
});

describe('computeSalesMap', () => {
  test('returns an empty map for invalid input', () => {
    expect(computeSalesMap(null).size).toBe(0);
    expect(computeSalesMap(undefined).size).toBe(0);
  });

  test('maps productId -> total quantity across orders', () => {
    const orders = [
      { items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] },
      { items: [{ productId: 'p1', quantity: 4 }] },
      { items: [{ productId: 'p3', quantity: 3 }] },
    ];
    const map = computeSalesMap(orders);
    expect(map.get('p1')).toBe(6);
    expect(map.get('p2')).toBe(1);
    expect(map.get('p3')).toBe(3);
    expect(map.has('p4')).toBe(false);
  });

  test('skips items without a productId', () => {
    const orders = [{ items: [{ quantity: 5 }, { productId: 'p1', quantity: 2 }] }];
    expect(computeSalesMap(orders).get('p1')).toBe(2);
  });
});
