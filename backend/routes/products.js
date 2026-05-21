const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { computePopularityScore, comparePopularity } = require('../lib/popularity');
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');
const Category = require('../models/Category');
const { sendDiscountEmail, isEmailConfigured } = require('../services/emailService');

async function validCategoryName(name) {
  if (!name) return false;
  const found = await Category.findOne({ name: String(name).trim() });
  return !!found;
}

const router = express.Router();
const managerOnly = [authenticate, requireRole('product_manager')];
const salesOnly = [authenticate, requireRole('sales_manager')];

async function aggregateReviewsForProductIds(productIds) {
  if (!productIds.length) return new Map();
  // Ratings are public the moment they are submitted; only the comment text
  // is gated by moderation, so aggregates count every review regardless of
  // status.
  const rows = await Review.aggregate([
    { $match: { productId: { $in: productIds } } },
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
    filter.category = String(category);
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

router.get('/categories', async (_req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json(cats.map((c) => c.name));
  } catch (err) {
    console.error('Failed to load categories:', err);
    res.status(500).json({ error: 'Could not load categories.' });
  }
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

async function notifyWishlistOfDiscount(product, oldPrice, newPrice, discountRate) {
  if (!isEmailConfigured()) {
    return { attempted: 0, sent: 0, skipped: 'email-not-configured' };
  }
  const entries = await Wishlist.find({ productId: product._id });
  if (entries.length === 0) return { attempted: 0, sent: 0 };

  const userIds = [...new Set(entries.map((e) => e.userId))]
    .map((id) => { try { return new mongoose.Types.ObjectId(id); } catch { return null; } })
    .filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select('email');

  let sent = 0;
  await Promise.all(
    users.map(async (u) => {
      if (!u.email) return;
      try {
        await sendDiscountEmail(u.email, product, oldPrice, newPrice, discountRate);
        sent += 1;
      } catch (err) {
        console.warn('Discount email failed for', u.email, err.message);
      }
    })
  );
  return { attempted: users.length, sent };
}

router.patch('/:id/pricing', salesOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  const update = {};
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number.' });
    }
    update.price = price;
  }
  if (req.body.cost !== undefined) {
    const cost = Number(req.body.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ error: 'Cost must be a non-negative number.' });
    }
    update.cost = cost;
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No price or cost provided.' });
  }

  try {
    const product = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product.toJSON());
  } catch (err) {
    console.error('Failed to update pricing:', err);
    res.status(500).json({ error: 'Could not update pricing.' });
  }
});

router.post('/discount', salesOnly, async (req, res) => {
  const { productIds, discountRate } = req.body || {};
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'productIds must be a non-empty array.' });
  }
  const rate = Number(discountRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 90) {
    return res.status(400).json({ error: 'discountRate must be between 0 and 90.' });
  }
  for (const id of productIds) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: `Invalid product id: ${id}` });
    }
  }

  try {
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length === 0) {
      return res.status(404).json({ error: 'No matching products found.' });
    }

    const results = [];
    for (const product of products) {
      const oldRate = product.discountRate || 0;
      const oldDiscounted = Product.computeDiscountedPrice(product.price, oldRate);
      const newDiscounted = Product.computeDiscountedPrice(product.price, rate);

      product.discountRate = rate;
      product.discountStartedAt = rate > 0 ? new Date() : null;
      await product.save();

      let notify = { attempted: 0, sent: 0 };
      if (rate > oldRate && rate > 0) {
        notify = await notifyWishlistOfDiscount(product, oldDiscounted, newDiscounted, rate);
      }

      results.push({
        productId: String(product._id),
        name: product.name,
        price: product.price,
        discountRate: rate,
        discountedPrice: newDiscounted,
        notified: notify.sent,
        notifyAttempted: notify.attempted,
      });
    }

    res.json({ updated: results.length, discountRate: rate, results });
  } catch (err) {
    console.error('Failed to apply discount:', err);
    res.status(500).json({ error: 'Could not apply discount.' });
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

router.post('/', managerOnly, async (req, res) => {
  const {
    code, name, description, price, cost, category,
    serialNumber, quantityInStock, warrantyMonths, distributorInfo, model,
  } = req.body;

  const missing = [];
  if (!code) missing.push('code');
  if (!name) missing.push('name');
  if (!description) missing.push('description');
  if (price === undefined || price === null || Number.isNaN(Number(price))) missing.push('price');
  if (serialNumber === undefined || serialNumber === null || serialNumber === '') missing.push('serialNumber');
  if (quantityInStock === undefined || quantityInStock === null) missing.push('quantityInStock');
  if (category === undefined || category === null || category === '') missing.push('category');
  if (model === undefined || model === null || String(model).trim() === '') missing.push('model');
  if (distributorInfo === undefined || distributorInfo === null || String(distributorInfo).trim() === '') missing.push('distributorInfo');
  if (warrantyMonths === undefined || warrantyMonths === null || Number.isNaN(Number(warrantyMonths))) missing.push('warrantyMonths');
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  if (!(await validCategoryName(category))) {
    return res.status(400).json({ error: `Unknown category: ${category}. Create it first.` });
  }

  try {
    const product = await Product.create({
      code, name, description,
      price: Number(price),
      cost: cost !== undefined ? Number(cost) : 0,
      category: String(category).trim(),
      serialNumber, quantityInStock: Number(quantityInStock),
      warrantyMonths: Number(warrantyMonths), distributorInfo, model,
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

const PATCH_ALLOWED_FIELDS = [
  'code', 'name', 'description', 'category', 'serialNumber',
  'warrantyMonths', 'distributorInfo', 'model', 'packageContents',
];

router.patch('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  const update = {};
  for (const field of PATCH_ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  if (update.category !== undefined) {
    if (!(await validCategoryName(update.category))) {
      return res.status(400).json({ error: `Unknown category: ${update.category}.` });
    }
    update.category = String(update.category).trim();
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided.' });
  }

  try {
    const product = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product.toJSON());
  } catch (err) {
    if (err.name === 'ValidationError' || err.code === 11000) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Failed to update product:', err);
    res.status(500).json({ error: 'Could not update product.' });
  }
});

router.delete('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    await Promise.all([
      Wishlist.deleteMany({ productId: product._id }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete product:', err);
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

module.exports = router;
