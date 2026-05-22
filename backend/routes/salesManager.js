const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const router = express.Router();
const salesManagerOnly = [authenticate, requireRole('sales_manager')];
const DAY_MS = 24 * 60 * 60 * 1000;

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function emptyRevenueResponse(startDate = null, endDate = null) {
  return {
    startDate,
    endDate,
    totalRevenue: 0,
    totalCost: 0,
    profit: 0,
    profitMargin: 0,
    chartData: [],
  };
}

function emptyInvoicesResponse(page = 1) {
  return {
    invoices: [],
    total: 0,
    page,
    totalPages: 0,
  };
}

function parseDateRange(query = {}) {
  const now = new Date();
  const end = query.endDate ? new Date(query.endDate) : now;
  const start = query.startDate ? new Date(query.startDate) : new Date(end.getTime() - 30 * DAY_MS);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return { invalid: true };
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    return { invalid: true };
  }

  return { start, end };
}

function getIsoWeek(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / DAY_MS) + 1) / 7);
}

function periodForDate(date, diffDays) {
  const d = new Date(date);
  if (diffDays <= 31) {
    return d.toISOString().slice(0, 10);
  }
  if (diffDays <= 90) {
    return `Week ${getIsoWeek(d)}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildRevenueReport(orders, start, end) {
  const diffDays = Math.ceil((end - start) / DAY_MS);
  const buckets = new Map();
  let totalRevenue = 0;
  let totalCost = 0;

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const order of sortedOrders) {
    const revenue = Number(order.totalPrice) || 0;
    const cost = revenue * 0.6;
    const profit = revenue - cost;
    const period = periodForDate(order.createdAt, diffDays);

    if (!buckets.has(period)) {
      buckets.set(period, { period, revenue: 0, cost: 0, profit: 0 });
    }

    const bucket = buckets.get(period);
    bucket.revenue += revenue;
    bucket.cost += cost;
    bucket.profit += profit;
    totalRevenue += revenue;
    totalCost += cost;
  }

  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? roundMoney((profit / totalRevenue) * 100) : 0;

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    totalRevenue: roundMoney(totalRevenue),
    totalCost: roundMoney(totalCost),
    profit: roundMoney(profit),
    profitMargin,
    chartData: [...buckets.values()].map((bucket) => ({
      period: bucket.period,
      revenue: roundMoney(bucket.revenue),
      cost: roundMoney(bucket.cost),
      profit: roundMoney(bucket.profit),
    })),
  };
}

function normalizePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit };
}

router.get('/revenue', salesManagerOnly, async (req, res) => {
  const parsed = parseDateRange(req.query);
  if (parsed.invalid) {
    return res.json(emptyRevenueResponse());
  }

  try {
    const orders = await Order.find({
      createdAt: { $gte: parsed.start, $lte: parsed.end },
      status: { $in: ['delivered', 'completed'] },
    }).lean();

    res.json(buildRevenueReport(orders, parsed.start, parsed.end));
  } catch (err) {
    console.error('Failed to compute sales manager revenue:', err);
    res.status(500).json({ error: 'Could not compute revenue.' });
  }
});

router.get('/invoices', salesManagerOnly, async (req, res) => {
  const { page, limit } = normalizePagination(req.query);
  const parsed = parseDateRange(req.query);
  if (parsed.invalid) {
    return res.json(emptyInvoicesResponse(page));
  }

  try {
    const filter = {
      createdAt: { $gte: parsed.start, $lte: parsed.end },
    };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const userIds = [...new Set(
      orders
        .map((order) => String(order.userId || ''))
        .filter((id) => mongoose.isValidObjectId(id))
    )];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('email username full_name').lean()
      : [];
    const userMap = Object.fromEntries(users.map((user) => [String(user._id), user]));

    const invoices = orders.map((order) => {
      const user = userMap[String(order.userId)];
      return {
        orderId: order._id,
        date: order.createdAt,
        customerName: user?.full_name || user?.username || order.userId,
        customerEmail: user?.email || '',
        totalPrice: order.totalPrice,
        status: order.status,
        items: order.items || [],
      };
    });

    res.json({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Failed to list sales manager invoices:', err);
    res.status(500).json({ error: 'Could not load invoices.' });
  }
});

module.exports = router;
module.exports._private = {
  buildRevenueReport,
  parseDateRange,
};
