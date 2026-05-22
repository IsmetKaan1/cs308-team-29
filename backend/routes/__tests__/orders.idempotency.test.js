const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/Order', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../../models/Product', () => ({
  find: jest.fn(),
  updateOne: jest.fn(),
  computeDiscountedPrice: jest.fn(),
}));
jest.mock('../../models/User', () => ({
  findById: jest.fn(),
}));
jest.mock('../../models/Cart', () => ({
  updateOne: jest.fn(),
}));
jest.mock('../../models/Payment', () => ({
  findOneAndUpdate: jest.fn(),
}));
jest.mock('../../lib/paymentStore', () => ({
  consumeTransaction: jest.fn(),
}));

const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Cart = require('../../models/Cart');
const Payment = require('../../models/Payment');
const { consumeTransaction } = require('../../lib/paymentStore');

const orderRoutes = require('../orders');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);
  return app;
}

function authToken(userId = 'user-123') {
  return jwt.sign({ id: userId, email: `${userId}@example.com` }, process.env.JWT_SECRET);
}

async function postJson(app, path, body, headers = {}, token = authToken()) {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...headers
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('POST /api/orders Idempotency', () => {
  let fakeOrdersDb = [];

  beforeEach(() => {
    jest.clearAllMocks();
    fakeOrdersDb = [];

    Order.findOne.mockImplementation(async (query) => {
      if (query.idempotencyKey) {
        return fakeOrdersDb.find(o => o.idempotencyKey === query.idempotencyKey) || null;
      }
      return null;
    });

    Order.create.mockImplementation(async (data) => {
      const newOrder = { _id: 'order-' + Date.now(), ...data };
      fakeOrdersDb.push(newOrder);
      return newOrder;
    });

    Product.find.mockResolvedValue([
      { _id: '507f1f77bcf86cd799439011', name: 'Product 1', code: 'P1', price: 100, discountRate: 0, quantityInStock: 10 }
    ]);
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Product.computeDiscountedPrice = (price, discount) => price * (1 - (discount || 0) / 100);

    Payment.findOneAndUpdate.mockResolvedValue({});
    Cart.updateOne.mockResolvedValue({});
    User.findById.mockResolvedValue({ email: 'test@example.com' });

    consumeTransaction.mockReturnValue({ ok: true, record: { cardLast4: '4242', approvedAt: new Date() } });
  });

  test('creates one order and returns the same order on replay, calling consumeTransaction exactly once', async () => {
    const app = createApp();
    const idempotencyKey = 'idem-key-123';
    const payload1 = {
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
      shippingAddress: { fullName: 'A', address: 'B', city: 'C', postalCode: 'D', country: 'E' },
      paymentTransactionId: 'txn-1'
    };

    const res1 = await postJson(app, '/api/orders', payload1, { 'Idempotency-Key': idempotencyKey });
    if (res1.status !== 201) console.error(res1.body);
    expect(res1.status).toBe(201);
    expect(fakeOrdersDb.length).toBe(1);
    expect(consumeTransaction).toHaveBeenCalledTimes(1);

    // Replay with exact same payload
    const res2 = await postJson(app, '/api/orders', payload1, { 'Idempotency-Key': idempotencyKey });
    expect(res2.status).toBe(200);
    expect(res2.body._id).toBe(res1.body._id);
    expect(fakeOrdersDb.length).toBe(1); // Still 1 order in DB
    expect(consumeTransaction).toHaveBeenCalledTimes(1); // Not called again!

    // Replay with modified cart body
    const payload2 = {
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 5 }],
      shippingAddress: { fullName: 'New Name', address: 'B', city: 'C', postalCode: 'D', country: 'E' },
      paymentTransactionId: 'txn-1'
    };
    const res3 = await postJson(app, '/api/orders', payload2, { 'Idempotency-Key': idempotencyKey });
    expect(res3.status).toBe(200);
    expect(res3.body._id).toBe(res1.body._id); // Still returns the first order!
    expect(fakeOrdersDb.length).toBe(1);
    expect(consumeTransaction).toHaveBeenCalledTimes(1); // Not called again!
  });
});
