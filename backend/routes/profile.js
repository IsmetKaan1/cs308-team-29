const express = require('express');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', authenticate, async (req, res) => {
  const { username, fullName, gender } = req.body;

  try {
    const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, full_name: fullName, gender },
      { new: true }
    );
    res.json({ id: user._id, email: user.email, username: user.username, fullName: user.full_name, gender: user.gender });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
