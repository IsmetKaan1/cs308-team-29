const express = require('express');
const authenticate = require('../middleware/auth');
const { authorizePayment } = require('../lib/mockBank');
const { registerTransaction } = require('../lib/paymentStore');

const router = express.Router();

router.post('/mock', authenticate, (req, res) => {
  try {
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
  } catch (err) {
    console.error('Payment mock failed:', err.message || err, 'request:', req.safeBody);
    res.status(500).json({ error: 'Payment processing failed.' });
  }
});

module.exports = router;
