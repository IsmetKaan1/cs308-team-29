const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const {
  validateRating,
  sanitizeComment,
  statusForNewReview,
  statusForUpdatedReview,
  applyModeration,
} = require('../lib/reviewModeration');

// Mounted at /api under both /products and /reviews below.
const productReviewsRouter = express.Router({ mergeParams: true });
const reviewsRouter = express.Router();

// Public: list every rating for the product. The rating is always public;
// the comment text is hidden until its moderation status is 'approved'.
productReviewsRouter.get('/', async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews.map((r) => formatReview(r, { redactUnapprovedComment: true })));
  } catch (err) {
    console.error('Failed to load reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function hasPurchasedProduct(userId, productId) {
  const order = await Order.findOne({
    userId: String(userId),
    paymentStatus: 'approved',
    status: 'delivered',
    'items.productId': productId,
  }).select('_id').lean();
  return !!order;
}

// Auth: report whether the caller is eligible to review this product (i.e. has purchased it).
productReviewsRouter.get('/eligibility', authenticate, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const eligible = await hasPurchasedProduct(req.user.id, productId);
    res.json({ eligible });
  } catch (err) {
    console.error('Failed to check review eligibility:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth: get the caller's own review for this product (any status), or 404.
productReviewsRouter.get('/mine', authenticate, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const review = await Review.findOne({ productId, userId: req.user.id });
    if (!review) return res.status(404).json({ error: 'No review yet.' });
    res.json(formatReview(review.toObject()));
  } catch (err) {
    console.error('Failed to load own review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth: create or update the caller's review.
productReviewsRouter.post('/', authenticate, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  const ratingResult = validateRating(req.body?.rating);
  if (!ratingResult.ok) {
    return res.status(400).json({ error: ratingResult.error });
  }

  const comment = sanitizeComment(req.body?.comment);
  if (comment.length > 1000) {
    return res.status(400).json({ error: 'Comment must be 1000 characters or fewer.' });
  }

  try {
    const [product, user, existing, purchased] = await Promise.all([
      Product.findById(productId),
      User.findById(req.user.id),
      Review.findOne({ productId, userId: req.user.id }),
      hasPurchasedProduct(req.user.id, productId),
    ]);

    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (!user)    return res.status(404).json({ error: 'User not found.' });
    if (!purchased) {
      return res.status(403).json({ error: 'You can only review this product after your order has been delivered.' });
    }

    const userName = user.full_name || user.fullName || user.username || 'Anonymous';

    if (existing) {
      const nextStatus = statusForUpdatedReview({
        existing,
        newComment: comment,
      });
      const previousStatus = existing.status;
      existing.rating = ratingResult.rating;
      existing.comment = comment;
      existing.userName = userName;
      existing.status = nextStatus;
      if (nextStatus !== 'rejected') existing.rejectionReason = '';
      if (nextStatus !== previousStatus) {
        existing.moderatedAt = null;
        existing.moderatedBy = null;
      }
      await existing.save();
      return res.json(formatReview(existing.toObject()));
    }

    const status = statusForNewReview({ comment });
    const created = await Review.create({
      productId,
      userId: req.user.id,
      userName,
      rating: ratingResult.rating,
      comment,
      status,
      moderatedAt: null,
    });
    res.status(201).json(formatReview(created.toObject()));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this product.' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Failed to save review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const managerModeration = [authenticate, requireRole('product_manager')];

// Manager: list reviews awaiting action across all products.
reviewsRouter.get('/pending', managerModeration, async (req, res) => {
  return listModerationQueue(req, res, 'pending');
});

// Manager: list rejected reviews so a rejection can be cancelled/reopened.
reviewsRouter.get('/rejected', managerModeration, async (req, res) => {
  return listModerationQueue(req, res, 'rejected');
});

async function listModerationQueue(req, res, status) {
  try {
    // Only reviews with a non-empty comment are subject to moderation.
    const reviews = await Review.find({
      status,
      comment: { $exists: true, $nin: ['', null] },
    })
      .sort({ createdAt: 1 })
      .lean();
    const productIds = [...new Set(reviews.map((r) => String(r.productId)))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select('code name')
      .lean();
    const productMap = Object.fromEntries(products.map((p) => [String(p._id), p]));
    res.json(
      reviews.map((r) => ({
        ...formatReview(r),
        product: productMap[String(r.productId)] || null,
      }))
    );
  } catch (err) {
    console.error(`Failed to load ${status} reviews:`, err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Manager: approve, reject, or reopen a review.
reviewsRouter.patch('/:id/moderate', managerModeration, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid review id.' });
  }

  const decision = applyModeration({
    action: req.body?.action,
    rejectionReason: req.body?.rejectionReason,
  });
  if (!decision.ok) return res.status(400).json({ error: decision.error });

  try {
    const patch = {
      ...decision.patch,
      moderatedBy: decision.patch.status === 'pending' ? null : req.user.id,
    };
    const review = await Review.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json(formatReview(review.toObject()));
  } catch (err) {
    console.error('Failed to moderate review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function formatReview(raw, opts = {}) {
  if (!raw) return raw;
  const { _id, __v, ...rest } = raw;
  const out = { ...rest, id: _id ? String(_id) : raw.id };
  if (opts.redactUnapprovedComment && out.status !== 'approved') {
    out.comment = '';
  }
  return out;
}

module.exports = { productReviewsRouter, reviewsRouter };
