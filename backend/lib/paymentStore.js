const Payment = require('../models/Payment');

/**
 * Persist an approved mock-bank transaction to MongoDB.
 * expiresAt = now + 15 minutes (TTL index will clean up unconsumed docs).
 */
async function registerTransaction(transactionId, meta = {}) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await Payment.create({
    transactionId,
    userId: meta.userId || '',
    amount: meta.amount,
    currency: 'TRY',
    cardLast4: meta.cardLast4 || '',
    cardHolderName: meta.cardHolderName || '',
    status: 'approved',
    approvedAt: meta.approvedAt ? new Date(meta.approvedAt) : new Date(),
    expiresAt,
  });
}

/**
 * Atomically consume an approved transaction.
 * Returns { ok: true, record } on success.
 * Returns { ok: false, error } on failure (not found, wrong user, expired, amount mismatch).
 *
 * Uses findOneAndUpdate for atomic single-consumer guarantee (no race condition).
 */
async function consumeTransaction(transactionId, { userId, expectedAmount } = {}) {
  if (!transactionId || typeof transactionId !== 'string') {
    return { ok: false, error: 'Payment transaction is required.' };
  }

  const now = new Date();

  const existing = await Payment.findOne({ transactionId });
  if (!existing) {
    return { ok: false, error: 'Payment transaction is invalid or has expired.' };
  }

  if (userId && existing.userId && existing.userId !== userId) {
    return { ok: false, error: 'Payment transaction does not belong to this user.' };
  }

  if (expectedAmount !== undefined && existing.amount !== undefined) {
    if (Math.abs(existing.amount - expectedAmount) > 0.01) {
      return { ok: false, error: 'Payment amount does not match order total.' };
    }
  }

  // Atomic consume: only succeeds if status is still 'approved' and not expired
  const record = await Payment.findOneAndUpdate(
    {
      transactionId,
      userId: userId || existing.userId,
      status: 'approved',
      expiresAt: { $gt: now },
    },
    {
      $set: { status: 'consumed', consumedAt: now },
    },
    { new: true }
  );

  if (!record) {
    if (existing.status === 'consumed') {
      return { ok: false, error: 'Payment transaction has already been used.' };
    }
    return { ok: false, error: 'Payment transaction is invalid or has expired.' };
  }

  return { ok: true, record };
}

/**
 * Clears all Payment documents. Only available in test environment.
 */
async function _resetForTests() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('_resetForTests() is only available in test environment');
  }
  await Payment.deleteMany({});
}

module.exports = { registerTransaction, consumeTransaction, _resetForTests };
