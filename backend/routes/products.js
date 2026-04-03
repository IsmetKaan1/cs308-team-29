const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort('_id');
    res.json(products);
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
