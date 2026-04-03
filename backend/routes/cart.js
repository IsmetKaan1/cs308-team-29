const express = require('express');
const Cart = require('../models/Cart');
const authenticate = require('../middleware/auth');
const router = express.Router();

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
  const { items } = req.body;
  try {
    const formattedItems = items.map(item => ({
      productId: item.productId || item._id || item.id, // accommodate frontend id variants
      quantity: item.quantity
    }));

    let cart = await Cart.findOne({ userId: req.user.id.toString() });
    if (cart) {
      cart.items = formattedItems;
      await cart.save();
    } else {
      cart = await Cart.create({ userId: req.user.id.toString(), items: formattedItems });
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
