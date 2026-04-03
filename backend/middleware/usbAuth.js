const db = require('../db');

function usbAuth(req, res, next) {
  const token = req.headers['x-usb-token'];

  if (!token) {
    return res.status(401).json({ error: 'USB token required' });
  }

  const row = db.prepare('SELECT * FROM usb_tokens WHERE token = ?').get(token);

  if (!row || !row.is_active) {
    return res.status(401).json({ error: 'Invalid or revoked USB token' });
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return res.status(401).json({ error: 'USB token has expired' });
  }

  db.prepare('UPDATE usb_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);

  req.usbToken = { valid: true, tokenId: row.id, userId: row.user_id };
  next();
}

module.exports = usbAuth;
