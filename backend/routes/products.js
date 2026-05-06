const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');

const router = express.Router();

async function aggregateReviewsForProductIds(productIds) {
  if (!productIds.length) return new Map();
  const rows = await Review.aggregate([
    { $match: { productId: { $in: productIds }, status: 'approved' } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  return new Map(
    rows.map((r) => [
      String(r._id),
      {
        averageRating: Math.round((r.averageRating || 0) * 10) / 10,
        reviewCount: r.reviewCount || 0,
      },
    ])
  );
}

async function aggregateSalesForProductIds(productIds) {
  if (!productIds.length) return new Map();
  const rows = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.productId': { $in: productIds } } },
    {
      $group: {
        _id: '$items.productId',
        salesCount: { $sum: '$items.quantity' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.salesCount || 0]));
}

function attachAggregate(productJson, review, salesCount) {
  const r = review || { averageRating: 0, reviewCount: 0 };
  return {
    ...productJson,
    averageRating: r.averageRating,
    reviewCount: r.reviewCount,
    salesCount: Number.isFinite(salesCount) ? salesCount : 0,
  };
}

router.get('/categories', (req, res) => {
  res.json(Product.CATEGORIES);
});

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      if (!Product.CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category.' });
      }
      filter.category = category;
    }

    const products = await Product.find(filter).sort('_id');
    const ids = products.map((p) => p._id);
    const [reviewMap, salesMap] = await Promise.all([
      aggregateReviewsForProductIds(ids),
      aggregateSalesForProductIds(ids),
    ]);
    res.json(
      products.map((p) =>
        attachAggregate(
          p.toJSON(),
          reviewMap.get(String(p._id)),
          salesMap.get(String(p._id))
        )
      )
    );
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
    const [reviewMap, salesMap] = await Promise.all([
      aggregateReviewsForProductIds([product._id]),
      aggregateSalesForProductIds([product._id]),
    ]);
    res.json(
      attachAggregate(
        product.toJSON(),
        reviewMap.get(String(product._id)),
        salesMap.get(String(product._id))
      )
    );
  } catch (error) {
    console.error('Failed to get product:', error);
    res.status(500).json({ error: 'Could not load the product.' });
  }
});

router.post('/', async (req, res) => {
  const {
    code, name, description, price, category,
    serialNumber, quantityInStock, warrantyMonths, distributorInfo, model,
  } = req.body;

  const missing = [];
  if (serialNumber === undefined || serialNumber === null || serialNumber === '') missing.push('serialNumber');
  if (quantityInStock === undefined || quantityInStock === null) missing.push('quantityInStock');
  if (category === undefined || category === null || category === '') missing.push('category');
  if (model === undefined || model === null || String(model).trim() === '') missing.push('model');
  if (distributorInfo === undefined || distributorInfo === null || String(distributorInfo).trim() === '') missing.push('distributorInfo');
  if (warrantyMonths === undefined || warrantyMonths === null || Number.isNaN(Number(warrantyMonths))) missing.push('warrantyMonths');
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  try {
    const product = await Product.create({
      code, name, description, price, category,
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
