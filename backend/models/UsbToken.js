const mongoose = require('mongoose');

const usbTokenSchema = new mongoose.Schema({
  token:        { type: String, required: true, unique: true },
  user_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_active:    { type: Boolean, default: true },
  expires_at:   { type: Date, default: null },
  last_used_at: { type: Date, default: null },
  created_at:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('UsbToken', usbTokenSchema);
