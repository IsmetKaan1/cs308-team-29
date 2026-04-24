/**
 * In-memory store of approved mock-bank transactions.
 *
 * A transaction is registered by POST /api/payments/mock when a card is
 * approved, and then consumed by POST /api/orders when the order is placed.
 * Each transactionId can only be consumed once. There is no persistence,
 * so a server restart invalidates in-flight approvals — that is fine for
 * a mock banking flow.
 */

const approvedTransactions = new Map();

function registerTransaction(transactionId, meta = {}) {
  approvedTransactions.set(transactionId, meta);
}

function consumeTransaction(transactionId, { userId } = {}) {
  if (!transactionId || typeof transactionId !== 'string') {
    return { ok: false, error: 'Payment transaction is required.' };
  }

  const record = approvedTransactions.get(transactionId);
  if (!record) {
    return { ok: false, error: 'Payment transaction is invalid or has expired.' };
  }

  if (userId && record.userId && record.userId !== userId) {
    return { ok: false, error: 'Payment transaction does not belong to this user.' };
  }

  approvedTransactions.delete(transactionId);
  return { ok: true, record };
}

function _resetForTests() {
  approvedTransactions.clear();
}

module.exports = {
  registerTransaction,
  consumeTransaction,
  _resetForTests,
};
