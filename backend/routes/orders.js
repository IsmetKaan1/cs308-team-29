const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const ORDER_STATUSES = ['Processing', 'In Transit', 'Delivered'];
const REQUIRED_ADDRESS_FIELDS = [
  ['fullName', 'Full name'],
  ['address', 'Address'],
  ['city', 'City'],
  ['postalCode', 'Postal code'],
  ['country', 'Country'],
];

function getAvailableStock(product) {
  return product.quantityInStock ?? product.stock;
}

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
  try {
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ error: 'Please enter a shipping address.' });
    }

    const cleanShippingAddress = {};
    for (const [field, label] of REQUIRED_ADDRESS_FIELDS) {
      const value = shippingAddress[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        return res.status(400).json({ error: `${label} is required.` });
      }
      cleanShippingAddress[field] = value.trim();
    }

    const itemProductIds = items.map((item) => item.id || item.productId).filter(Boolean);
    if (itemProductIds.length !== items.length) {
      return res.status(400).json({ error: 'One or more cart items are missing product information.' });
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ error: 'Cart item quantities must be at least 1.' });
      }
    }

    const productIds = [...new Set(itemProductIds.map((id) => id.toString()))];
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'One or more products in your cart could not be found.' });
    }

    const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

    for (const item of items) {
      const id = (item.id || item.productId).toString();
      const product = productMap[id];
      const availableStock = getAvailableStock(product);
      if (availableStock != null && availableStock < item.quantity) {
        return res.status(409).json({ error: `Not enough stock for ${product.name}.` });
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
      shippingAddress: cleanShippingAddress,
      status: 'Processing',
    });

    for (const item of items) {
      const id = (item.id || item.productId).toString();
      const product = productMap[id];
      if (product.quantityInStock != null) {
        await Product.findByIdAndUpdate(product._id, { $inc: { quantityInStock: -item.quantity } });
      } else if (product.stock != null) {
        await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
      }
    }

    res.status(201).json(order);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'One or more cart items are invalid.' });
    }
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Could not place the order. Please try again.' });
  }
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
