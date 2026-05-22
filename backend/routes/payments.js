const express = require('express');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { authorizePayment, refundPayment } = require('../lib/mockBank');
const { registerTransaction } = require('../lib/paymentStore');

const router = express.Router();

router.post('/mock', authenticate, (req, res) => {
    const { amount } = req.body || {};

    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
            approved: false,
            reason: 'invalid_input',
            error: 'amount must be a positive number',
        });
    }
    const normalizedAmount = Math.round(amount * 100) / 100;
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
    amount: normalizedAmount,
  });

  res.json({
    approved: true,
    transactionId: result.transactionId,
    approvedAt: result.approvedAt,
    cardLast4: result.cardLast4,
    amount: normalizedAmount,
  });
});

router.post('/mock/refund', authenticate, requireRole('sales_manager'), async (req, res) => {
  const { transactionId, amount } = req.body || {};

  if (!transactionId) {
    return res.status(400).json({ success: false, message: 'transactionId is required' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, message: 'amount must be a positive number' });
  }

  try {
    const result = await refundPayment({ transactionId, amount });

    if (!result.ok) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    return res.status(200).json({
      success: true,
      refundId: result.refundId,
      refundedAt: result.refundedAt,
      refundedAmount: result.refundedAmount,
    });
  } catch (err) {
    console.error('Mock refund failed:', err);
    return res.status(500).json({ success: false, message: 'Could not refund payment' });
  }
});

module.exports = router;
