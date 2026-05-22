const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/Order', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

const Order = require('../../models/Order');
const User = require('../../models/User');
const salesManagerRoutes = require('../salesManager');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales-manager', salesManagerRoutes);
  return app;
}

function authToken(userId = 'user-1') {
  return jwt.sign({ id: userId, email: `${userId}@example.com` }, process.env.JWT_SECRET);
}

function mockOrders(orders) {
  Order.find.mockReturnValue({
    lean: jest.fn().mockResolvedValue(orders),
  });
}

async function getJson(app, path, token = authToken()) {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue({ role: 'sales_manager' });
});

describe('GET /api/sales-manager/revenue', () => {
  test('returns zeroed totals and empty chartData when no orders are in range', async () => {
    mockOrders([]);
    const app = createApp();

    const response = await getJson(app, '/api/sales-manager/revenue');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalRevenue: 0,
      totalCost: 0,
      profit: 0,
      profitMargin: 0,
      chartData: [],
    });
  });

  test('returns the correct totalRevenue sum for known delivered orders', async () => {
    mockOrders([
      { totalPrice: 120, status: 'delivered', createdAt: new Date('2026-04-10T12:00:00Z') },
      { totalPrice: 80, status: 'delivered', createdAt: new Date('2026-04-11T12:00:00Z') },
    ]);
    const app = createApp();

    const response = await getJson(
      app,
      '/api/sales-manager/revenue?startDate=2026-04-01&endDate=2026-04-30'
    );

    expect(response.status).toBe(200);
    expect(Order.find).toHaveBeenCalledWith({
      createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
      status: { $in: ['delivered', 'completed'] },
    });
    expect(response.body.totalRevenue).toBe(200);
    expect(response.body.totalCost).toBe(120);
    expect(response.body.profit).toBe(80);
    expect(response.body.profitMargin).toBe(40);
  });

  test('returns 403 when the authenticated user is not a sales manager', async () => {
    User.findById.mockResolvedValue({ role: 'customer' });
    const app = createApp();

    const response = await getJson(app, '/api/sales-manager/revenue');

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/forbidden|insufficient role/i);
    expect(Order.find).not.toHaveBeenCalled();
  });
});
