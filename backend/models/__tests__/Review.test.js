const mongoose = require('mongoose');
const Review = require('../Review');

describe('Review Model', () => {
  it('should be invalid without required fields', () => {
    const review = new Review({});
    const error = review.validateSync();
    expect(error.errors.productId).toBeDefined();
    expect(error.errors.userId).toBeDefined();
    expect(error.errors.userName).toBeDefined();
    expect(error.errors.rating).toBeDefined();
  });

  it('should be valid with required fields', () => {
    const review = new Review({
      productId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test User',
      rating: 4
    });
    const error = review.validateSync();
    expect(error).toBeUndefined();
  });

  it('should default to pending status', () => {
    const review = new Review({
      productId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test User',
      rating: 5
    });
    expect(review.status).toBe('pending');
  });

  it('should invalidate rating outside 1-5 range', () => {
    const review = new Review({
      productId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test User',
      rating: 6
    });
    const error = review.validateSync();
    expect(error.errors.rating).toBeDefined();
  });

  it('should invalidate non-integer rating', () => {
    const review = new Review({
      productId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test User',
      rating: 4.5
    });
    const error = review.validateSync();
    expect(error.errors.rating).toBeDefined();
  });
});
