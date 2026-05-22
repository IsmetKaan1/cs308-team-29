/** Keys that must never appear in payment/order API responses or persisted payloads. */
const SENSITIVE_PAYMENT_KEYS = ['cardNumber', 'cvv', 'pan'];

/** Allowed masked card fields on outward-facing payment/order data. */
const MASKED_CARD_KEYS = ['cardLast4', 'paymentCardLast4'];

/**
 * Recursively find sensitive payment key paths (for tests and audits).
 */
function findSensitivePaymentKeys(value, path = '') {
  const found = [];
  if (value === null || value === undefined || typeof value !== 'object') {
    return found;
  }

  for (const [key, nested] of Object.entries(value)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_PAYMENT_KEYS.includes(key)) {
      found.push(keyPath);
    }
    if (nested && typeof nested === 'object') {
      found.push(...findSensitivePaymentKeys(nested, keyPath));
    }
  }

  return found;
}

/** Public JSON shape for POST /api/payments/mock success. */
function toPublicPaymentSuccess(result) {
  return {
    approved: true,
    transactionId: result.transactionId,
    approvedAt: result.approvedAt,
    cardLast4: result.cardLast4,
  };
}

/** Public JSON shape for POST /api/payments/mock denial. */
function toPublicPaymentDenied(result) {
  return {
    approved: false,
    reason: result.reason,
    error: result.error,
  };
}

/** Strip sensitive keys from order JSON (GET /api/orders/me and similar). */
function sanitizeOrderJson(ret) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
  for (const key of SENSITIVE_PAYMENT_KEYS) {
    delete ret[key];
  }
  // Orders expose paymentCardLast4 only — not cardLast4 from the payment step.
  delete ret.cardLast4;
  return ret;
}

module.exports = {
  SENSITIVE_PAYMENT_KEYS,
  MASKED_CARD_KEYS,
  findSensitivePaymentKeys,
  toPublicPaymentSuccess,
  toPublicPaymentDenied,
  sanitizeOrderJson,
};
