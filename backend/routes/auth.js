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
  };
}

router.post('/register', async (req, res) => {
  const { email, username, fullName, gender, password } = req.body;

  if (!email || !username || !fullName || !gender || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    const user = await User.create({ email, username, full_name: fullName, gender, password });
    const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toUserPayload(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toUserPayload(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
