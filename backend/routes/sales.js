const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { generateInvoicePdf } = require('../services/pdfService');

const router = express.Router();
const salesOnly = [authenticate, requireRole('sales_manager')];

function parseDateRange(query) {
  const out = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isFinite(d.getTime())) return { error: 'Invalid from date.' };
    out.from = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isFinite(d.getTime())) return { error: 'Invalid to date.' };
    d.setHours(23, 59, 59, 999);
    out.to = d;
  }
  if (out.from && out.to && out.from > out.to) {
    return { error: 'from must be before to.' };
  }
  return { range: out };
}

function buildDateFilter(range) {
  const filter = {};
  if (range.from || range.to) {
    filter.createdAt = {};
    if (range.from) filter.createdAt.$gte = range.from;
    if (range.to) filter.createdAt.$lte = range.to;
  }
  return filter;
}

router.get('/invoices', salesOnly, async (req, res) => {
  try {
    const parsed = parseDateRange(req.query);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const filter = buildDateFilter(parsed.range);
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500);

    const userIds = [...new Set(orders.map((o) => o.userId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('email full_name username').lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const invoices = orders.map((o) => {
      const json = o.toJSON();
      const u = userMap[String(o.userId)];
      json.buyer = u ? { email: u.email, fullName: u.full_name, username: u.username } : null;
      return json;
    });

    res.json({
      from: parsed.range.from || null,
      to: parsed.range.to || null,
      count: invoices.length,
      totalAmount: invoices.reduce((s, i) => s + (i.totalPrice || 0), 0),
      invoices,
    });
  } catch (err) {
    console.error('Failed to list invoices:', err);
    res.status(500).json({ error: 'Could not load invoices.' });
  }
});

router.get('/invoices/:id/pdf', salesOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const pdfBuffer = await generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice_${order._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Failed to render invoice PDF:', err);
    res.status(500).json({ error: 'Could not generate invoice.' });
  }
});

router.get('/analytics/revenue', salesOnly, async (req, res) => {
  try {
    const parsed = parseDateRange(req.query);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const granularity = (req.query.granularity || 'day').toLowerCase();
    if (!['day', 'week', 'month'].includes(granularity)) {
      return res.status(400).json({ error: 'granularity must be day, week, or month.' });
    }

    const filter = buildDateFilter(parsed.range);
    const orders = await Order.find(filter);

    const productIds = [...new Set(
      orders.flatMap((o) => o.items.map((i) => String(i.productId)))
    )];
    const products = await Product.find({ _id: { $in: productIds } }).select('cost').lean();
    const costMap = Object.fromEntries(products.map((p) => [String(p._id), Number(p.cost) || 0]));

    function bucketKey(date) {
      const d = new Date(date);
      if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (granularity === 'week') {
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
        return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      }
      return d.toISOString().slice(0, 10);
    }

    const buckets = new Map();
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnits = 0;

    for (const order of orders) {
      const key = bucketKey(order.createdAt);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { period: key, revenue: 0, cost: 0, profit: 0, orders: 0, units: 0 };
        buckets.set(key, bucket);
      }
      bucket.orders += 1;
      for (const item of order.items) {
        const lineRevenue = (item.price || 0) * (item.quantity || 0);
        const lineCost = (costMap[String(item.productId)] || 0) * (item.quantity || 0);
        bucket.revenue += lineRevenue;
        bucket.cost += lineCost;
        bucket.units += item.quantity || 0;
        totalRevenue += lineRevenue;
        totalCost += lineCost;
        totalUnits += item.quantity || 0;
      }
      bucket.profit = bucket.revenue - bucket.cost;
    }

    const series = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      from: parsed.range.from || null,
      to: parsed.range.to || null,
      granularity,
      totals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        cost: Math.round(totalCost * 100) / 100,
        profit: Math.round((totalRevenue - totalCost) * 100) / 100,
        orders: orders.length,
        units: totalUnits,
      },
      series: series.map((b) => ({
        period: b.period,
        revenue: Math.round(b.revenue * 100) / 100,
        cost: Math.round(b.cost * 100) / 100,
        profit: Math.round(b.profit * 100) / 100,
        orders: b.orders,
        units: b.units,
      })),
    });
  } catch (err) {
    console.error('Failed to compute revenue:', err);
    res.status(500).json({ error: 'Could not compute revenue.' });
  }
});

module.exports = router;
