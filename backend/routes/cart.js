const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');
const router = express.Router();

function getAvailableStock(product) {
  return product.quantityInStock ?? product.stock ?? 0;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return { ok: false, error: 'Cart items must be an array.' };
  }

  const byId = new Map();
  for (const item of items) {
    const productId = item?.productId || item?._id || item?.id;
    const quantity = Number(item?.quantity);
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return { ok: false, error: 'One or more cart items are invalid.' };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: 'Cart item quantities must be at least 1.' };
    }

    const key = productId.toString();
    byId.set(key, (byId.get(key) || 0) + quantity);
  }

  return {
    ok: true,
    items: [...byId.entries()].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

// GET current user cart
router.get('/', authenticate, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id.toString() }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id.toString(), items: [] });
    }
    
    // Map backend populated items to the frontend flat structure
    const flattenedItems = cart.items.map(item => {
      // populate can give null if product was deleted
      const p = item.productId || {};
      return {
        id: p._id || p.id || item.productId,
        code: p.code,
        name: p.name,
        price: p.price,
        description: p.description,
        quantityInStock: p.quantityInStock,
        stock: p.stock,
        quantity: item.quantity
      };
    }).filter(i => i.code); // keep only valid items

    res.json({ ...cart.toJSON(), items: flattenedItems });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST sync user cart (replace items)
router.post('/', authenticate, async (req, res) => {
  const normalized = normalizeItems(req.body?.items);
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    const formattedItems = normalized.items;
    const productIds = formattedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'One or more products in your cart could not be found.' });
    }

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    for (const item of formattedItems) {
      const product = productMap.get(item.productId);
      const availableStock = getAvailableStock(product);
      if (availableStock <= 0) {
        return res.status(409).json({ error: `${product.name} is out of stock.` });
      }
      if (item.quantity > availableStock) {
        return res.status(409).json({ error: `Only ${availableStock} left in stock for ${product.name}.` });
      }
    }

    let cart = await Cart.findOne({ userId: req.user.id.toString() });
    const previousQuantities = new Map(
      (cart?.items || []).map((item) => [item.productId.toString(), item.quantity])
    );

    if (cart) {
      cart.items = formattedItems;
      await cart.save();
    } else {
      cart = await Cart.create({ userId: req.user.id.toString(), items: formattedItems });
    }
    const metricUpdates = formattedItems
      .map((item) => ({
        productId: item.productId,
        added: Math.max(0, item.quantity - (previousQuantities.get(item.productId) || 0)),
      }))
      .filter((item) => item.added > 0);

    if (metricUpdates.length) {
      await Promise.all(
        metricUpdates.map((item) =>
          Product.updateOne({ _id: item.productId }, { $inc: { cartAddCount: item.added } })
        )
      );
    }

    res.json(cart);
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
