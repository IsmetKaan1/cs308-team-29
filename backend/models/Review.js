const mongoose = require('mongoose');

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: { type: String, required: true, trim: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5.',
      },
    },
    comment: { type: String, default: '', trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: 'pending',
      index: true,
    },
    moderatedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

reviewSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

const Review = mongoose.model('Review', reviewSchema);
Review.STATUSES = REVIEW_STATUSES;

module.exports = Review;
module.exports.STATUSES = REVIEW_STATUSES;
