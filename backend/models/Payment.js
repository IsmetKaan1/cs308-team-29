const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: { type: String, required: true },
  amount: { type: Number, required: true },
  refundedAt: { type: Date, default: Date.now },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['authorized', 'consumed'],
    default: 'authorized',
  },
  cardLast4: { type: String, default: '' },
  approvedAt: { type: Date, default: Date.now },
  consumedAt: { type: Date, default: null },
  refundedAmount: { type: Number, default: 0, min: 0 },
  refunds: [refundSchema],
});

paymentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
