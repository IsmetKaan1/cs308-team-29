const mongoose = require('mongoose');

const RETURN_STATUSES = ['pending', 'approved', 'rejected'];

const returnSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: String, required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productCode: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalRefund: { type: Number, required: true, min: 0 },
  reason: { type: String, default: '' },
  status: { type: String, enum: RETURN_STATUSES, default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

returnSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

const Return = mongoose.model('Return', returnSchema);
Return.STATUSES = RETURN_STATUSES;

module.exports = Return;
module.exports.STATUSES = RETURN_STATUSES;
