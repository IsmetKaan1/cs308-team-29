const express = require('express');
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.user.id.toString() }).sort({ createdAt: -1 });
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const map = Object.fromEntries(products.map((p) => [String(p._id), p.toJSON()]));
    res.json(
      items
        .map((i) => ({ id: i.id, productId: String(i.productId), createdAt: i.createdAt, product: map[String(i.productId)] || null }))
        .filter((entry) => entry.product)
    );
  } catch (err) {
    console.error('Failed to list wishlist:', err);
    res.status(500).json({ error: 'Could not load wishlist.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { productId } = req.body || {};
  if (!productId || !mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Valid productId is required.' });
  }
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const entry = await Wishlist.findOneAndUpdate(
      { userId: req.user.id.toString(), productId: product._id },
      { $setOnInsert: { userId: req.user.id.toString(), productId: product._id } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json({ id: entry.id, productId: String(entry.productId), createdAt: entry.createdAt });
  } catch (err) {
    console.error('Failed to add to wishlist:', err);
    res.status(500).json({ error: 'Could not add to wishlist.' });
  }
});

router.delete('/:productId', authenticate, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    await Wishlist.deleteOne({ userId: req.user.id.toString(), productId });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to remove wishlist entry:', err);
    res.status(500).json({ error: 'Could not remove wishlist entry.' });
  }
});

module.exports = router;
