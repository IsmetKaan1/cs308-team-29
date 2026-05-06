const mongoose = require('mongoose');
const Order = require('../Order');

describe('Order Model', () => {
  it('should be invalid if required fields are empty', () => {
    const order = new Order({});
    const error = order.validateSync();
    expect(error.errors.userId).toBeDefined();
    expect(error.errors.totalPrice).toBeDefined();
    expect(error.errors.shippingAddress).toBeDefined();
    expect(error.errors.paymentTransactionId).toBeDefined();
  });

  it('should be valid with all required fields provided', () => {
    const order = new Order({
      userId: 'user-123',
      items: [{
        productId: new mongoose.Types.ObjectId(),
        name: 'Item',
        code: 'CODE1',
        price: 10,
        quantity: 2
      }],
      totalPrice: 20,
      shippingAddress: {
        fullName: 'Test User',
        address: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Testland'
      },
      paymentTransactionId: 'txn-123'
    });
    const error = order.validateSync();
    expect(error).toBeUndefined();
  });

  it('should default status to Processing', () => {
    const order = new Order({
      userId: 'user-123',
      items: [],
      totalPrice: 0,
      shippingAddress: { fullName: 'a', address: 'b', city: 'c', postalCode: 'd', country: 'e' },
      paymentTransactionId: 'txn-123'
    });
    expect(order.status).toBe('Processing');
  });

  it('should only allow valid statuses', () => {
    const order = new Order({
      userId: 'user-123',
      items: [],
      totalPrice: 0,
      shippingAddress: { fullName: 'a', address: 'b', city: 'c', postalCode: 'd', country: 'e' },
      paymentTransactionId: 'txn-123',
      status: 'InvalidStatus'
    });
    const error = order.validateSync();
    expect(error.errors.status).toBeDefined();
  });

  it('should have approved as default paymentStatus', () => {
    const order = new Order({
      userId: 'user-123',
      items: [],
      totalPrice: 0,
      shippingAddress: { fullName: 'a', address: 'b', city: 'c', postalCode: 'd', country: 'e' },
      paymentTransactionId: 'txn-123'
    });
    expect(order.paymentStatus).toBe('approved');
  });

  it('should restrict paymentStatus to approved or declined', () => {
    const order = new Order({
      userId: 'user-123',
      items: [],
      totalPrice: 0,
      shippingAddress: { fullName: 'a', address: 'b', city: 'c', postalCode: 'd', country: 'e' },
      paymentTransactionId: 'txn-123',
      paymentStatus: 'pending' // invalid
    });
    const error = order.validateSync();
    expect(error.errors.paymentStatus).toBeDefined();
  });
});
