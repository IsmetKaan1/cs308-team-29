const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const managerPass = require('../middleware/managerPass');
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

// Public: list approved reviews for a product.
productReviewsRouter.get('/', async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const reviews = await Review.find({ productId, status: 'approved' })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews.map(formatReview));
  } catch (err) {
    console.error('Failed to load reviews:', err);
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

  const ratingResult = validateRating(Number(req.body?.rating));
  if (!ratingResult.ok) {
    return res.status(400).json({ error: ratingResult.error });
  }

  const comment = sanitizeComment(req.body?.comment);
  if (comment.length > 1000) {
    return res.status(400).json({ error: 'Comment must be 1000 characters or fewer.' });
  }

  try {
    const [product, user, existing] = await Promise.all([
      Product.findById(productId),
      User.findById(req.user.id),
      Review.findOne({ productId, userId: req.user.id }),
    ]);

    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (!user)    return res.status(404).json({ error: 'User not found.' });

    const userName = user.fullName || user.username || 'Anonymous';

    if (existing) {
      const nextStatus = statusForUpdatedReview({ existing, newComment: comment });
      existing.rating = ratingResult.rating;
      existing.comment = comment;
      existing.userName = userName;
      existing.status = nextStatus;
      if (nextStatus !== 'rejected') existing.rejectionReason = '';
      if (nextStatus !== existing.status) existing.moderatedAt = null;
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
      moderatedAt: status === 'approved' ? new Date() : null,
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

// Manager: list pending reviews across all products.
reviewsRouter.get('/pending', managerPass, async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'pending' })
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
    console.error('Failed to load pending reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Manager: approve or reject a review.
reviewsRouter.patch('/:id/moderate', managerPass, async (req, res) => {
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
    const review = await Review.findByIdAndUpdate(id, decision.patch, { new: true });
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json(formatReview(review.toObject()));
  } catch (err) {
    console.error('Failed to moderate review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function formatReview(raw) {
  if (!raw) return raw;
  const { _id, __v, ...rest } = raw;
  return { ...rest, id: _id ? String(_id) : raw.id };
}

module.exports = { productReviewsRouter, reviewsRouter };
