/** Masked card label for order confirmation and order lists (last 4 only). */
export function formatMaskedCardLast4(last4) {
  if (!last4 || typeof last4 !== 'string') return null;
  const digits = last4.replace(/\D/g, '').slice(-4);
  if (digits.length !== 4) return null;
  return `•••• ${digits}`;
}

export function getOrderCardLast4(order) {
  if (!order) return null;
  return order.paymentCardLast4 || order.cardLast4 || null;
}
