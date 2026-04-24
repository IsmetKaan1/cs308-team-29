const express = require('express');
const mongoose = require('mongoose');
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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    console.error('Failed to get product:', error);
    res.status(500).json({ error: 'Could not load the product.' });
  }
});

router.post('/', async (req, res) => {
  const { code, name, description, price, serialNumber, quantityInStock, warrantyMonths, distributorInfo, model } = req.body;

  const missing = [];
  if (serialNumber === undefined || serialNumber === null || serialNumber === '') missing.push('serialNumber');
  if (quantityInStock === undefined || quantityInStock === null) missing.push('quantityInStock');
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  try {
    const product = await Product.create({
      code, name, description, price,
      serialNumber, quantityInStock,
      warrantyMonths, distributorInfo, model,
    });
    res.status(201).json(product);
  } catch (error) {
    if (error.name === 'ValidationError' || error.code === 11000) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
