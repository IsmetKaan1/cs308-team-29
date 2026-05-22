/**
 * Mock banking authorizer. Pure functions only — no DB, no I/O, no state.
 *
 * Rule: card numbers whose last 4 digits are "0000" are declined.
 * Everything else is approved. Real bank logic is out of scope.
 */

const { randomBytes } = require('crypto');
const Payment = require('../models/Payment');

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

async function refundPayment({ transactionId, amount }) {
  if (!transactionId) return { ok: false, error: 'transactionId is required', status: 400 };
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return { ok: false, error: 'amount must be a positive number', status: 400 };
  }

  const payment = await Payment.findOne({ transactionId, status: 'consumed' });
  if (!payment) {
    return { ok: false, error: 'Transaction not found or not eligible for refund', status: 404 };
  }

  const alreadyRefunded = payment.refundedAmount || 0;
  const refundable = Math.round((payment.amount - alreadyRefunded) * 100) / 100;
  if (amount > refundable + 0.01) {
    return { ok: false, error: `Refund amount ${amount} exceeds refundable balance ${refundable}`, status: 400 };
  }

  const refundId = 'rfnd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const refundedAt = new Date();
  payment.refundedAmount = Math.round((alreadyRefunded + amount) * 100) / 100;
  payment.refunds.push({ refundId, amount, refundedAt });
  await payment.save();

  return {
    ok: true,
    refundId,
    refundedAt,
    refundedAmount: payment.refundedAmount,
    originalAmount: payment.amount,
  };
}

module.exports = {
  validatePaymentInput,
  authorizePayment,
  refundPayment,
  CARD_DIGITS,
  CVV_DIGITS,
};
