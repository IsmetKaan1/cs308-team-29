/**
 * Mock payment routes.
 *
 * Sensitive fields (cardNumber, cvv) must never be logged or persisted.
 * Use req.body only for in-memory authorization; use req.safeBody (from
 * sanitizePaymentBody middleware) for any request logging.
 */
const express = require('express');
const authenticate = require('../middleware/auth');
const { authorizePayment } = require('../lib/mockBank');
const {
  toPublicPaymentDenied,
  toPublicPaymentSuccess,
} = require('../lib/paymentExposure');
const { registerTransaction } = require('../lib/paymentStore');

const router = express.Router();

router.post('/mock', authenticate, (req, res) => {
  // req.body holds real card data for authorizePayment only; never log it.
  const result = authorizePayment(req.body || {});

  if (!result.approved) {
    const status = result.reason === 'invalid_input' ? 400 : 402;
    console.error('Payment authorization failed:', {
      reason: result.reason,
      request: req.safeBody ?? {},
    });
    return res.status(status).json(toPublicPaymentDenied(result));
  }

  registerTransaction(result.transactionId, {
    userId: req.user.id.toString(),
    approvedAt: result.approvedAt,
    cardLast4: result.cardLast4,
  });

  res.json(toPublicPaymentSuccess(result));
});

module.exports = router;
