const UsbToken = require('../models/UsbToken');

async function usbAuth(req, res, next) {
  const token = req.headers['x-usb-token'];

  if (!token) {
    return res.status(401).json({ error: 'USB token required' });
  }

  try {
    const row = await UsbToken.findOne({ token });

    if (!row || !row.is_active) {
      return res.status(401).json({ error: 'Invalid or revoked USB token' });
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ error: 'USB token has expired' });
    }

    row.last_used_at = new Date();
    await row.save();

    req.usbToken = { valid: true, tokenId: row._id, userId: row.user_id };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = usbAuth;
