const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const ORDER_STATUSES = ['Processing', 'In Transit', 'Delivered'];

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id.toString() }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const requiredAddressFields = ['fullName', 'address', 'city', 'postalCode', 'country'];
  for (const field of requiredAddressFields) {
    if (!shippingAddress?.[field]?.trim()) {
      return res.status(400).json({ error: `Missing shipping address field: ${field}` });
    }
  }

  const productIds = items.map((i) => i.id || i.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== items.length) {
    return res.status(404).json({ error: 'One or more products not found' });
  }

  const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

  for (const item of items) {
    const id = (item.id || item.productId).toString();
    const product = productMap[id];
    if (product.stock != null && product.stock < item.quantity) {
      return res.status(409).json({ error: `Insufficient stock for: ${product.name}` });
    }
  }

  const orderItems = items.map((item) => {
    const id = (item.id || item.productId).toString();
    const product = productMap[id];
    return {
      productId: product._id,
      name: product.name,
      code: product.code,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    userId: req.user.id.toString(),
    items: orderItems,
    totalPrice,
    shippingAddress,
    status: 'processing',
  });

  for (const item of items) {
    const id = (item.id || item.productId).toString();
    const product = productMap[id];
    if (product.stock != null) {
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
    }
  }

  res.status(201).json(order);
});

router.patch('/:id/status', authenticate, requireRole('product_manager'), async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
