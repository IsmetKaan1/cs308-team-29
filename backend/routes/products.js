const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const managerPass = require('../middleware/managerPass');
const { computePopularityScore, comparePopularity } = require('../lib/popularity');

const router = express.Router();
const managerOnly = [authenticate, requireRole('product_manager'), managerPass];

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
  const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.productId': { $in: productIds } } },
    {
      $group: {
        _id: '$items.productId',
        purchaseCount: { $sum: '$items.quantity' },
        recentPurchaseCount: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', recentCutoff] }, '$items.quantity', 0],
          },
        },
      },
    },
  ]);
  return new Map(
    rows.map((r) => [
      String(r._id),
      {
        purchaseCount: r.purchaseCount || 0,
        recentPurchaseCount: r.recentPurchaseCount || 0,
      },
    ])
  );
}

function attachAggregate(productJson, review, sales) {
  const r = review || { averageRating: 0, reviewCount: 0 };
  const s = sales || { purchaseCount: 0, recentPurchaseCount: 0 };
  const cartAddCount = productJson.cartAddCount || 0;
  const popularityScore = computePopularityScore({
    purchaseCount: s.purchaseCount,
    recentPurchaseCount: s.recentPurchaseCount,
    cartAddCount,
    averageRating: r.averageRating,
    reviewCount: r.reviewCount,
  });
  return {
    ...productJson,
    averageRating: r.averageRating,
    reviewCount: r.reviewCount,
    purchaseCount: s.purchaseCount,
    recentPurchaseCount: s.recentPurchaseCount,
    cartAddCount,
    salesCount: s.purchaseCount,
    popularityScore,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProductFilter(query) {
  const { category, q } = query;
  const filter = {};

  if (category && category !== 'all') {
    if (!Product.CATEGORIES.includes(category)) {
      return { error: 'Invalid category.' };
    }
    filter.category = category;
  }

  if (q && String(q).trim()) {
    const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [
      { name: regex },
      { description: regex },
      { code: regex },
      { model: regex },
    ];
  }

  return { filter };
}

function sortProducts(products, sort) {
  const list = [...products];
  switch (sort) {
    case 'price-asc':
    case 'price_asc':
      return list.sort((a, b) => (a.price - b.price) || String(a.id).localeCompare(String(b.id)));
    case 'price-desc':
    case 'price_desc':
      return list.sort((a, b) => (b.price - a.price) || String(a.id).localeCompare(String(b.id)));
    case 'popularity':
      return list.sort(comparePopularity);
    default:
      return list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
}

async function loadProductsWithAggregates(filter, sort) {
  const products = await Product.find(filter).sort('_id');
  const ids = products.map((p) => p._id);
  const [reviewMap, salesMap] = await Promise.all([
    aggregateReviewsForProductIds(ids),
    aggregateSalesForProductIds(ids),
  ]);

  const enriched = products.map((p) =>
    attachAggregate(
      p.toJSON(),
      reviewMap.get(String(p._id)),
      salesMap.get(String(p._id))
    )
  );

  return sortProducts(enriched, sort);
}

router.get('/categories', (req, res) => {
  res.json(Product.CATEGORIES);
});

router.get('/', async (req, res) => {
  try {
    const { filter, error } = buildProductFilter(req.query);
    if (error) return res.status(400).json({ error });
    res.json(await loadProductsWithAggregates(filter, req.query.sort));
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stock', managerOnly, async (req, res) => {
  try {
    const { filter, error } = buildProductFilter(req.query);
    if (error) return res.status(400).json({ error });
    res.json(await loadProductsWithAggregates(filter, req.query.sort));
  } catch (error) {
    console.error('Failed to get product stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/stock', managerOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  const quantityInStock = Number(req.body?.quantityInStock);
  if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative integer.' });
  }

  try {
    const product = await Product.findByIdAndUpdate(
      id,
      { quantityInStock, stock: null },
      { new: true, runValidators: true }
    );
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
    console.error('Failed to update product stock:', error);
    res.status(500).json({ error: 'Could not update stock.' });
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
