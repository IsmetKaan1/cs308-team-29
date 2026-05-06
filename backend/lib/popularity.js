/**
 * Popularity scoring for product sorting.
 *
 * A product's popularityScore is deterministic and intentionally explainable:
 * - confirmed purchases matter most because they are paid demand;
 * - recent purchases add a small freshness boost;
 * - cart additions count as buying intent;
 * - approved rating quality and approved review volume add social proof.
 *
 * Formula:
 *   purchases * 5
 * + recentPurchases30d * 3
 * + cartAdds * 1
 * + averageRating * reviewCount * 0.8
 *
 * Ties are resolved by name and id at the route layer so sorting is stable.
 */

function computePopularityScore({
  purchaseCount = 0,
  recentPurchaseCount = 0,
  cartAddCount = 0,
  averageRating = 0,
  reviewCount = 0,
} = {}) {
  const purchases = Math.max(0, Number(purchaseCount) || 0);
  const recent = Math.max(0, Number(recentPurchaseCount) || 0);
  const cartAdds = Math.max(0, Number(cartAddCount) || 0);
  const rating = Math.min(5, Math.max(0, Number(averageRating) || 0));
  const reviews = Math.max(0, Number(reviewCount) || 0);

  return Math.round(
    (
      purchases * 5 +
      recent * 3 +
      cartAdds +
      rating * reviews * 0.8
    ) * 100
  ) / 100;
}

function comparePopularity(a, b) {
  const scoreDiff = (b.popularityScore || 0) - (a.popularityScore || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const purchaseDiff = (b.purchaseCount || 0) - (a.purchaseCount || 0);
  if (purchaseDiff !== 0) return purchaseDiff;

  const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
  if (ratingDiff !== 0) return ratingDiff;

  const nameDiff = String(a.name || '').localeCompare(String(b.name || ''), 'tr');
  if (nameDiff !== 0) return nameDiff;

  return String(a.id || '').localeCompare(String(b.id || ''));
}

module.exports = {
  computePopularityScore,
  comparePopularity,
};
