const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

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

router.post('/register', async (req, res) => {
  const { email, username, fullName, gender, password, taxId, homeAddress } = req.body;

  if (!email || !username || !fullName || !gender || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (taxId && !/^[0-9]{10,11}$/.test(String(taxId).trim())) {
    return res.status(400).json({ error: 'Tax ID must be 10 or 11 digits.' });
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const user = await User.create({
      email, username, full_name: fullName, gender, password,
      taxId: taxId ? String(taxId).trim() : '',
      homeAddress: homeAddress && typeof homeAddress === 'object' ? homeAddress : {},
    });
    const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toUserPayload(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, username, identifier, password } = req.body;
  // Only accept string credentials — anything else (e.g. an injected object)
  // is treated as missing rather than passed into the query.
  const rawId = identifier || email || username || '';
  const id = typeof rawId === 'string' ? rawId.trim() : '';

  if (!id || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }

  try {
    const user = await User.findOne({ $or: [{ email: id }, { username: id }] });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toUserPayload(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
