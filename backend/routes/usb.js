const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, reason: 'Token is required' });
  }

  const row = db.prepare('SELECT * FROM usb_tokens WHERE token = ?').get(token);

  if (!row) {
    return res.status(401).json({ valid: false, reason: 'Token not found' });
  }

  if (!row.is_active) {
    return res.status(401).json({ valid: false, reason: 'Token has been revoked' });
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return res.status(401).json({ valid: false, reason: 'Token has expired' });
  }

  db.prepare('UPDATE usb_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);

  res.json({ valid: true, userId: row.user_id });
});

router.post('/generate', authenticate, (req, res) => {
  const token = crypto.randomUUID();
  const userId = req.user.id;

  db.prepare('INSERT INTO usb_tokens (token, user_id, is_active, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    1,
    req.body.expiresAt || null
  );

  res.json({ token });
});

router.get('/tokens', authenticate, (req, res) => {
  const tokens = db
    .prepare('SELECT id, user_id, is_active, created_at, expires_at, last_used_at FROM usb_tokens WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  res.json(tokens);
});

module.exports = router;
