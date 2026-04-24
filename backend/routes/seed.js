const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const requireDevEnv = require('../middleware/requireDevEnv');

const router = express.Router();

router.use(requireDevEnv);

// POST /api/seed/pm — promote a user to product_manager by email
router.post('/pm', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const user = await User.findOneAndUpdate({ email }, { role: 'product_manager' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `${user.email} is now a product_manager`, role: user.role });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/seed/orders — seed 3 test orders for a given userId
router.post('/orders', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const products = await Product.find().limit(3);
    if (products.length === 0) return res.status(404).json({ error: 'No products found to seed orders' });

    const dummyAddress = {
      fullName: 'Test User',
      address: '123 Demo St',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'Turkey',
    };

    const statuses = ['Processing', 'In Transit', 'Delivered'];

    const orders = await Order.insertMany(
      statuses.map((status, i) => ({
        userId,
        items: [{
          productId: products[i % products.length]._id,
          name: products[i % products.length].name,
          code: products[i % products.length].code,
          price: products[i % products.length].price,
          quantity: 1,
        }],
        totalPrice: products[i % products.length].price,
        shippingAddress: dummyAddress,
        status,
        createdAt: new Date(Date.now() - (2 - i) * 86400000),
      }))
    );

    res.status(201).json({ message: `Seeded ${orders.length} orders`, orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;
