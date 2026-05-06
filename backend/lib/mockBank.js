/**
 * Mock banking authorizer. Pure functions only — no DB, no I/O, no state.
 *
 * Rule: card numbers whose last 4 digits are "0000" are declined.
 * Everything else is approved. Real bank logic is out of scope.
 */

const { randomBytes } = require('crypto');

const CARD_DIGITS = 16;
const CVV_DIGITS = 3;

function digitsOnly(value) {
  return typeof value === 'string' ? value.replace(/\D+/g, '') : '';
}

function validatePaymentInput({ cardHolderName, cardNumber, expiry, cvv } = {}) {
  if (typeof cardHolderName !== 'string' || !cardHolderName.trim()) {
    return { ok: false, error: 'Cardholder name is required.' };
  }

  const cardDigits = digitsOnly(cardNumber);
  if (cardDigits.length !== CARD_DIGITS) {
    return { ok: false, error: `Card number must be ${CARD_DIGITS} digits.` };
  }

  const cvvDigits = digitsOnly(cvv);
  if (cvvDigits.length !== CVV_DIGITS) {
    return { ok: false, error: `CVV must be ${CVV_DIGITS} digits.` };
  }

  if (typeof expiry !== 'string' || !/^\d{2}\/\d{2}$/.test(expiry)) {
    return { ok: false, error: 'Expiry must be in MM/YY format.' };
  }

  const [mmRaw, yyRaw] = expiry.split('/');
  const mm = Number(mmRaw);
  const yy = Number(yyRaw);
  if (mm < 1 || mm > 12) {
    return { ok: false, error: 'Expiry month is invalid.' };
  }

  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (yy < currentYY || (yy === currentYY && mm < currentMonth)) {
    return { ok: false, error: 'Card has expired.' };
  }

  return {
    ok: true,
    normalized: {
      cardHolderName: cardHolderName.trim(),
      cardLast4: cardDigits.slice(-4),
      expiry,
    },
  };
}

function newTransactionId() {
  return `TXN-${randomBytes(8).toString('hex').toUpperCase()}`;
}

/**
 * Authorize a validated payment request. Deterministic for testing:
 * any card ending in "0000" is declined; everything else is approved.
 */
function authorizePayment({ cardHolderName, cardNumber, expiry, cvv } = {}) {
  const validation = validatePaymentInput({ cardHolderName, cardNumber, expiry, cvv });
  if (!validation.ok) {
    return { approved: false, reason: 'invalid_input', error: validation.error };
  }

  const { cardLast4 } = validation.normalized;

  if (cardLast4 === '0000') {
    return {
      approved: false,
      reason: 'declined_by_bank',
      error: 'The bank declined this card.',
      cardLast4,
    };
  }

  return {
    approved: true,
    transactionId: newTransactionId(),
    approvedAt: new Date().toISOString(),
    cardLast4,
    cardHolderName: validation.normalized.cardHolderName,
  };
}

module.exports = {
  validatePaymentInput,
  authorizePayment,
  CARD_DIGITS,
  CVV_DIGITS,
};
