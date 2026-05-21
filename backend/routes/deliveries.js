const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const router = express.Router();
const managerOnly = [authenticate, requireRole('product_manager')];

function deliveryId(orderId, itemId) {
  return `${orderId}-${itemId}`;
}

function parseDeliveryId(combined) {
  const idx = String(combined || '').lastIndexOf('-');
  if (idx < 0) return null;
  return {
    orderId: combined.slice(0, idx),
    itemId: combined.slice(idx + 1),
  };
}

router.get('/', managerOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.completed === 'true') filter['items.delivered'] = true;
    if (req.query.completed === 'false') filter['items.delivered'] = false;

    const orders = await Order.find().sort({ createdAt: -1 });

    const userIds = [...new Set(orders.map((o) => o.userId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('email full_name username')
      .lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const deliveries = [];
    for (const order of orders) {
      for (const item of order.items) {
        const completed = !!item.delivered || order.status === 'delivered';
        if (req.query.completed === 'true' && !completed) continue;
        if (req.query.completed === 'false' && completed) continue;

        const customer = userMap[String(order.userId)] || null;
        deliveries.push({
          deliveryId: deliveryId(order._id, item._id),
          orderId: String(order._id),
          customerId: order.userId,
          customer: customer
            ? { email: customer.email, fullName: customer.full_name, username: customer.username }
            : null,
          productId: String(item.productId),
          productName: item.name,
          productCode: item.code,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: Math.round(item.price * item.quantity * 100) / 100,
          deliveryAddress: order.shippingAddress,
          orderStatus: order.status,
          completed,
          deliveredAt: item.deliveredAt || (order.status === 'delivered' ? order.createdAt : null),
          createdAt: order.createdAt,
        });
      }
    }

    res.json({ count: deliveries.length, deliveries });
  } catch (err) {
    console.error('Failed to list deliveries:', err);
    res.status(500).json({ error: 'Could not load deliveries.' });
  }
});

router.patch('/:deliveryId/complete', managerOnly, async (req, res) => {
  const parsed = parseDeliveryId(req.params.deliveryId);
  if (!parsed) return res.status(400).json({ error: 'Invalid delivery id.' });

  try {
    const completed = req.body?.completed !== false;
    const order = await Order.findById(parsed.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const item = order.items.id(parsed.itemId);
    if (!item) return res.status(404).json({ error: 'Delivery line not found.' });

    item.delivered = completed;
    item.deliveredAt = completed ? new Date() : null;

    const allDelivered = order.items.every((i) => i.delivered);
    if (allDelivered) order.status = 'delivered';
    else if (order.status === 'delivered') order.status = 'in-transit';

    await order.save();

    res.json({
      deliveryId: deliveryId(order._id, item._id),
      completed: item.delivered,
      deliveredAt: item.deliveredAt,
      orderStatus: order.status,
    });
  } catch (err) {
    console.error('Failed to update delivery:', err);
    res.status(500).json({ error: 'Could not update delivery.' });
  }
});

module.exports = router;
