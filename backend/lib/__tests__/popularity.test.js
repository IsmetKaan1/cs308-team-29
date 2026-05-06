const { computePopularityScore, comparePopularity } = require('../popularity');

describe('computePopularityScore', () => {
  test('weights purchases, cart adds, and approved review signal', () => {
    expect(
      computePopularityScore({
        purchaseCount: 10,
        recentPurchaseCount: 2,
        cartAddCount: 4,
        averageRating: 4.5,
        reviewCount: 3,
      })
    ).toBe(70.8);
  });

  test('normalizes invalid and negative inputs', () => {
    expect(
      computePopularityScore({
        purchaseCount: -1,
        recentPurchaseCount: Number.NaN,
        cartAddCount: 'x',
        averageRating: 10,
        reviewCount: 1,
      })
    ).toBe(4);
  });
});

describe('comparePopularity', () => {
  test('sorts by score, purchases, rating, name, then id', () => {
    const products = [
      { id: 'b', name: 'Beta', popularityScore: 10, purchaseCount: 1, averageRating: 5 },
      { id: 'a', name: 'Alpha', popularityScore: 10, purchaseCount: 1, averageRating: 5 },
      { id: 'c', name: 'Gamma', popularityScore: 11, purchaseCount: 0, averageRating: 1 },
    ];
    expect([...products].sort(comparePopularity).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
});
