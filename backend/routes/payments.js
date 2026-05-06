const express = require('express');
const authenticate = require('../middleware/auth');
const { authorizePayment } = require('../lib/mockBank');
const { registerTransaction } = require('../lib/paymentStore');

const router = express.Router();

router.post('/mock', authenticate, (req, res) => {
  const result = authorizePayment(req.body || {});

  if (!result.approved) {
    const status = result.reason === 'invalid_input' ? 400 : 402;
    return res.status(status).json({
      approved: false,
      reason: result.reason,
      error: result.error,
    });
  }

  registerTransaction(result.transactionId, {
    userId: req.user.id.toString(),
    approvedAt: result.approvedAt,
    cardLast4: result.cardLast4,
  });

  res.json({
    approved: true,
    transactionId: result.transactionId,
    approvedAt: result.approvedAt,
    cardLast4: result.cardLast4,
  });
});

module.exports = router;
