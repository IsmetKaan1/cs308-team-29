const express = require('express');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

const HOME_ADDRESS_FIELDS = ['fullName', 'address', 'city', 'postalCode', 'country'];

function normalizeHomeAddress(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const field of HOME_ADDRESS_FIELDS) {
    if (input[field] !== undefined) {
      out[field] = typeof input[field] === 'string' ? input[field].trim() : '';
    }
  }
  return out;
}

function toUserPayload(user) {
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    gender: user.gender,
    role: user.role,
    taxId: user.taxId || '',
    homeAddress: user.homeAddress || {},
  };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toUserPayload(user));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', authenticate, async (req, res) => {
  const { username, fullName, gender, taxId, homeAddress } = req.body;

  try {
    const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const update = { username, full_name: fullName, gender };
    if (taxId !== undefined) {
      const trimmed = String(taxId).trim();
      if (trimmed && !/^[0-9]{10,11}$/.test(trimmed)) {
        return res.status(400).json({ error: 'Tax ID must be 10 or 11 digits.' });
      }
      update.taxId = trimmed;
    }
    const normalizedAddress = normalizeHomeAddress(homeAddress);
    if (normalizedAddress) {
      update.homeAddress = { ...(req.body.homeAddress || {}), ...normalizedAddress };
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json(toUserPayload(user));
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
