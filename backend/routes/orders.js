const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { generateInvoicePdf } = require('../services/pdfService');
const { sendInvoiceEmail, isEmailConfigured } = require('../services/emailService');
const { refundPayment } = require('../lib/mockBank');
const { consumeTransaction } = require('../lib/paymentStore');

const ORDER_STATUSES = Order.STATUSES;
const STATUS_ALIASES = {
  Processing: 'processing',
  'In Transit': 'in-transit',
  Delivered: 'delivered',
  processing: 'processing',
  'in-transit': 'in-transit',
  delivered: 'delivered',
};
const REQUIRED_ADDRESS_FIELDS = [
  ['fullName', 'Full name'],
  ['address', 'Address'],
  ['city', 'City'],
  ['postalCode', 'Postal code'],
  ['country', 'Country'],
];

function getAvailableStock(product) {
  return product.quantityInStock ?? product.stock ?? 0;
}

function normalizeOrderStatus(status) {
  return STATUS_ALIASES[status] || null;
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, error: 'Your cart is empty.' };
  }

  const byId = new Map();
  for (const item of items) {
    const productId = item?.id || item?.productId;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return { ok: false, status: 400, error: 'One or more cart items are invalid.' };
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, status: 400, error: 'Cart item quantities must be at least 1.' };
    }

    const key = productId.toString();
    byId.set(key, (byId.get(key) || 0) + item.quantity);
  }

  return {
    ok: true,
    items: [...byId.entries()].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

async function reserveStock(orderItems) {
  const reserved = [];

  for (const item of orderItems) {
    const result = await Product.updateOne(
      { _id: item.productId, quantityInStock: { $gte: item.quantity } },
      { $inc: { quantityInStock: -item.quantity } }
    );

    if (result.modifiedCount !== 1) {
      await releaseStock(reserved);
      return { ok: false, error: `Not enough stock for ${item.name}.` };
    }

    reserved.push(item);
  }

  return { ok: true, reserved };
}

async function releaseStock(items) {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.productId },
        { $inc: { quantityInStock: item.quantity } }
      )
    )
  );
}

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id.toString() }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticate, requireRole('product_manager'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const normalized = normalizeOrderStatus(req.query.status);
      if (!normalized) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });
      }
      filter.status = normalized;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    const userIds = [...new Set(orders.map((o) => o.userId).filter(Boolean))]
      .map((id) => {
        try { return new mongoose.Types.ObjectId(id); } catch { return null; }
      })
      .filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select('email username full_name')
      .lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const enriched = orders.map((o) => {
      const u = userMap[String(o.userId)];
      const json = o.toJSON();
      json.buyer = u
        ? { email: u.email, username: u.username, fullName: u.full_name }
        : null;
      return json;
    });
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const idempotencyKey = req.header('Idempotency-Key') || req.body.idempotencyKey;
    if (idempotencyKey && idempotencyKey.length > 128) {
      return res.status(400).json({ error: 'Idempotency key is too long (max 128 chars).' });
    }

    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ userId: req.user.id.toString(), idempotencyKey });
      if (existingOrder) {
        // Return the existing order directly on replay. 
        // We do not re-run transaction consumption or stock reservation, 
        // even if the cart body changed. We just return the first successful order.
        return res.status(200).json(existingOrder);
      }
    }

    const { items, shippingAddress, paymentTransactionId } = req.body;

    const normalizedItems = normalizeOrderItems(items);
    if (!normalizedItems.ok) {
      return res.status(normalizedItems.status).json({ error: normalizedItems.error });
    }

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ error: 'Please enter a shipping address.' });
    }

    const cleanShippingAddress = {};
    for (const [field, label] of REQUIRED_ADDRESS_FIELDS) {
      const value = shippingAddress[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        return res.status(400).json({ error: `${label} is required.` });
      }
      cleanShippingAddress[field] = value.trim();
    }

    const productIds = normalizedItems.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'One or more products in your cart could not be found.' });
    }

    const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

    for (const item of normalizedItems.items) {
      const product = productMap[item.productId];
      const availableStock = getAvailableStock(product);
      if (availableStock <= 0) {
        return res.status(409).json({ error: `${product.name} is out of stock.` });
      }
      if (availableStock < item.quantity) {
        return res.status(409).json({ error: `Not enough stock for ${product.name}.` });
      }
    }

    const orderItems = normalizedItems.items.map((item) => {
      const product = productMap[item.productId];
      const effectivePrice = Product.computeDiscountedPrice(product.price, product.discountRate);
      return {
        productId: product._id,
        name: product.name,
        code: product.code,
        price: effectivePrice,
        quantity: item.quantity,
      };
    });

    const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const reservation = await reserveStock(orderItems);
    if (!reservation.ok) {
      return res.status(409).json({ error: reservation.error });
    }

    const payment = await consumeTransaction(paymentTransactionId, {
      userId: req.user.id.toString(),
      expectedAmount: totalPrice,
    });
    if (!payment.ok) {
      await releaseStock(reservation.reserved);
      return res.status(402).json({ error: payment.error });
    }

    let order;
    try {
      order = await Order.create({
        userId: req.user.id.toString(),
        items: orderItems,
        totalPrice,
        shippingAddress: cleanShippingAddress,
        status: 'processing',
        forwardedToDeliveryAt: new Date(),
        paymentTransactionId,
        paymentStatus: 'approved',
        paymentCardLast4: payment.record.cardLast4 || '',
        paidAt: payment.record.approvedAt ? new Date(payment.record.approvedAt) : new Date(),
        idempotencyKey,
      });
      // Link the order back to the payment document
      await Payment.findOneAndUpdate(
        { transactionId: paymentTransactionId },
        { $set: { orderId: order._id.toString() } }
      ).catch((err) => console.error('Failed to set orderId on Payment:', err));
    } catch (err) {
      await releaseStock(reservation.reserved);
      throw err;
    }

    await Cart.updateOne(
      { userId: req.user.id.toString() },
      { $set: { items: [] } }
    ).catch((err) => {
      console.warn('Could not clear cart after order', order._id, ':', err.message);
    });

    // Async Invoice Generation & Email Sending
    (async () => {
      try {
        const user = await User.findById(req.user.id);
        if (!isEmailConfigured()) {
          console.warn('Invoice email skipped because SMTP environment variables are not configured.');
          await Order.findByIdAndUpdate(order._id, {
            invoiceEmailStatus: 'skipped',
            invoiceEmailError: 'Email service is not configured.',
          });
          return;
        }

        if (user && user.email) {
          const pdfBuffer = await generateInvoicePdf(order);
          await sendInvoiceEmail(user.email, order, pdfBuffer);
          await Order.findByIdAndUpdate(order._id, {
            invoiceEmailStatus: 'sent',
            invoiceEmailedAt: new Date(),
            invoiceEmailError: '',
          });
          console.log(`Invoice sent successfully to ${user.email} for order ${order._id}`);
        } else {
          await Order.findByIdAndUpdate(order._id, {
            invoiceEmailStatus: 'skipped',
            invoiceEmailError: 'User email address is missing.',
          });
        }
      } catch (err) {
        console.error('Error in async invoice generation/email sending for order', order._id, ':', err.message);
        await Order.findByIdAndUpdate(order._id, {
          invoiceEmailStatus: 'failed',
          invoiceEmailError: err.message.slice(0, 500),
        }).catch(() => {});
      }
    })();

    res.status(201).json(order);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'One or more cart items are invalid.' });
    }
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Could not place the order. Please try again.' });
  }
});

router.patch('/:id/status', authenticate, requireRole('product_manager'), async (req, res) => {
  const status = normalizeOrderStatus(req.body?.status);
  if (!status) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    // Keep the per-item delivery flag (the delivery-list "completed" field)
    // in sync with the order status so the two views never disagree.
    const delivered = status === 'delivered';
    for (const item of order.items) {
      item.delivered = delivered;
      item.deliveredAt = delivered ? new Date() : null;
    }
    await order.save();
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }
  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.userId !== req.user.id.toString()) {
      return res.status(403).json({ error: 'You can only cancel your own orders.' });
    }
    if (order.status !== 'processing') {
      return res.status(409).json({
        error: 'Orders can only be cancelled while they are still being processed.',
      });
    }

    const reason = typeof req.body?.reason === 'string'
      ? req.body.reason.trim().slice(0, 500)
      : '';

    await releaseStock(
      order.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    if (order.paymentTransactionId) {
      const refundResult = await refundPayment({
        transactionId: order.paymentTransactionId,
        amount: order.totalPrice,
      });
      order.refundStatus = refundResult.ok ? 'refunded' : 'failed';
    } else {
      order.refundStatus = 'skipped';
    }
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('Failed to cancel order:', err);
    res.status(500).json({ error: 'Could not cancel the order.' });
  }
});

router.get('/:id/invoice', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id.toString() && req.user.role !== 'product_manager') {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    const pdfBuffer = await generateInvoicePdf(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice_${order._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).json({ error: 'Could not generate invoice' });
  }
});

router.post('/:id/invoice/resend', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized to resend this invoice' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.email) {
      return res.status(400).json({ error: 'No email address on file for this account.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email service is not configured.' });
    }

    const pdfBuffer = await generateInvoicePdf(order);
    await sendInvoiceEmail(user.email, order, pdfBuffer);
    await Order.findByIdAndUpdate(order._id, {
      invoiceEmailStatus: 'sent',
      invoiceEmailedAt: new Date(),
      invoiceEmailError: '',
    });

    res.json({ message: 'Invoice sent.', email: user.email });
  } catch (err) {
    console.error('Error resending invoice for order', req.params.id, ':', err);
    res.status(500).json({ error: 'Could not resend the invoice. Please try again later.' });
  }
});

module.exports = router;
