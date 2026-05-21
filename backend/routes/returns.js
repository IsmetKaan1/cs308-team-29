const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Return = require('../models/Return');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const router = express.Router();
const managerOnly = [authenticate, requireRole('product_manager')];

const RETURN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isWithinReturnWindow(order) {
  const ref = order.cancelledAt || order.createdAt;
  return ref && Date.now() - new Date(ref).getTime() <= RETURN_WINDOW_MS;
}

router.get('/me', authenticate, async (req, res) => {
  try {
    const list = await Return.find({ userId: req.user.id.toString() }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('Failed to list returns:', err);
    res.status(500).json({ error: 'Could not load returns.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { orderId, orderItemId, quantity, reason } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }
  if (!mongoose.isValidObjectId(orderItemId)) {
    return res.status(400).json({ error: 'Invalid order item id.' });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.userId !== req.user.id.toString()) {
      return res.status(403).json({ error: 'You can only return items from your own orders.' });
    }
    if (order.status !== 'delivered') {
      return res.status(409).json({ error: 'Only delivered orders can be returned.' });
    }
    if (!isWithinReturnWindow(order)) {
      return res.status(409).json({ error: 'Return window has expired (30 days after delivery).' });
    }

    const item = order.items.id(orderItemId);
    if (!item) return res.status(404).json({ error: 'Order item not found.' });
    if (qty > item.quantity) {
      return res.status(400).json({ error: `Cannot return more than ${item.quantity} units.` });
    }

    const alreadyRequested = await Return.aggregate([
      { $match: { orderId: order._id, orderItemId: item._id, status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    const reservedQty = alreadyRequested[0]?.total || 0;
    if (reservedQty + qty > item.quantity) {
      return res.status(409).json({
        error: `Only ${item.quantity - reservedQty} unit(s) of this item are still eligible for return.`,
      });
    }

    const totalRefund = Math.round(item.price * qty * 100) / 100;

    const created = await Return.create({
      orderId: order._id,
      orderItemId: item._id,
      userId: order.userId,
      productId: item.productId,
      productName: item.name,
      productCode: item.code,
      quantity: qty,
      unitPrice: item.price,
      totalRefund,
      reason: typeof reason === 'string' ? reason.trim().slice(0, 500) : '',
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create return:', err);
    res.status(500).json({ error: 'Could not submit return request.' });
  }
});

router.get('/', managerOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!Return.STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'Invalid status filter.' });
      }
      filter.status = req.query.status;
    }
    const returns = await Return.find(filter).sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    console.error('Failed to list returns:', err);
    res.status(500).json({ error: 'Could not load returns.' });
  }
});

router.patch('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid return id.' });
  }
  const action = String(req.body?.action || '').toLowerCase();
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject".' });
  }

  try {
    const ret = await Return.findById(id);
    if (!ret) return res.status(404).json({ error: 'Return not found.' });
    if (ret.status !== 'pending') {
      return res.status(409).json({ error: `Return is already ${ret.status}.` });
    }

    if (action === 'approve') {
      ret.status = 'approved';
      ret.reviewedBy = req.user.id;
      ret.reviewedAt = new Date();
      await Product.updateOne(
        { _id: ret.productId },
        { $inc: { quantityInStock: ret.quantity } }
      );
      await Order.updateOne(
        { _id: ret.orderId },
        { $set: { refundStatus: 'refunded' } }
      );
    } else {
      ret.status = 'rejected';
      ret.reviewedBy = req.user.id;
      ret.reviewedAt = new Date();
      ret.rejectionNote = typeof req.body?.note === 'string'
        ? req.body.note.trim().slice(0, 500)
        : '';
    }

    await ret.save();
    res.json(ret);
  } catch (err) {
    console.error('Failed to moderate return:', err);
    res.status(500).json({ error: 'Could not update return.' });
  }
});

module.exports = router;
