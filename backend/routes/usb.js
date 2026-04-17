const express = require('express');
const crypto = require('crypto');
const UsbToken = require('../models/UsbToken');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, reason: 'Token is required' });
  }

  try {
    const row = await UsbToken.findOne({ token });

    if (!row) {
      return res.status(401).json({ valid: false, reason: 'Token not found' });
    }
    if (!row.is_active) {
      return res.status(401).json({ valid: false, reason: 'Token has been revoked' });
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ valid: false, reason: 'Token has expired' });
    }

    row.last_used_at = new Date();
    await row.save();

    res.json({ valid: true, userId: row.user_id });
  } catch (err) {
    res.status(500).json({ valid: false, reason: 'Server error' });
  }
});

router.post('/generate', authenticate, async (req, res) => {
  try {
    const doc = await UsbToken.create({
      token: crypto.randomUUID(),
      user_id: req.user.id,
      is_active: true,
      expires_at: req.body.expiresAt || null
    });
    res.json({ token: doc.token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/tokens', authenticate, async (req, res) => {
  try {
    const tokens = await UsbToken.find({ user_id: req.user.id }).sort({ _id: -1 });
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
