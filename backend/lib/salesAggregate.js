/**
 * Pure sales aggregation helpers. No DB, no I/O, no state.
 *
 * `salesCount` for a product is the sum of `quantity` across every
 * order line that references that product. All order statuses count —
 * once an order is placed, stock is decremented and the unit is sold,
 * regardless of whether it has shipped yet.
 */

function computeSalesCount(orders, productId) {
  if (!Array.isArray(orders) || productId == null) return 0;
  const target = String(productId);
  let total = 0;
  for (const order of orders) {
    if (!order || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const id = item?.productId != null ? String(item.productId) : null;
      if (id === target) {
        const q = Number(item.quantity);
        if (Number.isFinite(q) && q > 0) total += q;
      }
    }
  }
  return total;
}

function computeSalesMap(orders) {
  const map = new Map();
  if (!Array.isArray(orders)) return map;
  for (const order of orders) {
    if (!order || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const id = item?.productId != null ? String(item.productId) : null;
      if (!id) continue;
      const q = Number(item.quantity);
      if (!Number.isFinite(q) || q <= 0) continue;
      map.set(id, (map.get(id) || 0) + q);
    }
  }
  return map;
}

module.exports = { computeSalesCount, computeSalesMap };
