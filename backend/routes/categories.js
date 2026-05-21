const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const router = express.Router();
const managerOnly = [authenticate, requireRole('product_manager')];

router.get('/', async (_req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json(cats.map((c) => c.name));
  } catch (err) {
    console.error('Failed to list categories:', err);
    res.status(500).json({ error: 'Could not load categories.' });
  }
});

router.post('/', managerOnly, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const existing = await Category.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Category already exists.' });
    const category = await Category.create({ name });
    res.status(201).json({ id: category.id, name: category.name });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Category already exists.' });
    console.error('Failed to create category:', err);
    res.status(500).json({ error: 'Could not create category.' });
  }
});

router.delete('/:name', managerOnly, async (req, res) => {
  const name = String(req.params.name).trim();
  try {
    const inUse = await Product.exists({ category: name });
    if (inUse) {
      return res.status(409).json({ error: 'Cannot delete a category that still has products.' });
    }
    const result = await Category.deleteOne({ name });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Category not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete category:', err);
    res.status(500).json({ error: 'Could not delete category.' });
  }
});

module.exports = router;
