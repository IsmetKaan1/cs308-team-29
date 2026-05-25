const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['approved', 'consumed', 'expired'];

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  userId:         { type: String, default: '', index: true },
  amount:         { type: Number, required: true, min: 0 },
  currency:       { type: String, default: 'TRY' },
  cardLast4:      { type: String, default: '' },
  cardHolderName: { type: String, default: '' },
  status: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'approved',
  },
  approvedAt:  { type: Date, default: Date.now },
  consumedAt:  { type: Date, default: null },
  expiresAt:   { type: Date },
  orderId:     { type: String },
});

// TTL: MongoDB removes documents ~15 min after expiresAt; background task runs every 60s so actual delay may be up to 75s
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 900 });
paymentSchema.index({ userId: 1, status: 1 });

paymentSchema.pre('save', async function () {
  this.amount = Math.round(this.amount * 100) / 100;
});

paymentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

const Payment = mongoose.model('Payment', paymentSchema);
Payment.STATUSES = PAYMENT_STATUSES;

module.exports = Payment;
module.exports.STATUSES = PAYMENT_STATUSES;
