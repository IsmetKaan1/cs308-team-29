const mongoose = require('mongoose');
const Cart = require('../Cart');

describe('Cart Model', () => {
  it('should be invalid if userId is missing', () => {
    const cart = new Cart({});
    const error = cart.validateSync();
    expect(error.errors.userId).toBeDefined();
  });

  it('should be valid with empty items array', () => {
    const cart = new Cart({ userId: 'user-123' });
    const error = cart.validateSync();
    expect(error).toBeUndefined();
    expect(cart.items).toHaveLength(0);
  });

  it('should validate cart items correctly', () => {
    const cart = new Cart({
      userId: 'user-123',
      items: [{ productId: new mongoose.Types.ObjectId() }] // quantity defaults to 1
    });
    const error = cart.validateSync();
    expect(error).toBeUndefined();
    expect(cart.items[0].quantity).toBe(1);
  });

  it('should require productId in items', () => {
    const cart = new Cart({
      userId: 'user-123',
      items: [{ quantity: 2 }] // missing productId
    });
    const error = cart.validateSync();
    expect(error.errors['items.0.productId']).toBeDefined();
  });
});
