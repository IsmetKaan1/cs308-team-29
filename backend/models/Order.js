const mongoose = require('mongoose');

const ORDER_STATUSES = ['processing', 'in-transit', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  delivered: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: null },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { type: [orderItemSchema], required: true },
  totalPrice: { type: Number, required: true },
  shippingAddress: { type: shippingAddressSchema, required: true },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'processing',
  },
  forwardedToDeliveryAt: { type: Date, default: Date.now },
  invoiceEmailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped'],
    default: 'pending',
  },
  invoiceEmailError: { type: String, default: '' },
  invoiceEmailedAt: { type: Date, default: null },
  paymentTransactionId: { type: String, required: true },
  paymentStatus: {
    type: String,
    enum: ['approved', 'declined'],
    default: 'approved',
  },
  paymentCardLast4: { type: String, default: '' },
  paidAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: '' },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'refunded', 'partial', 'failed', 'skipped'],
    default: 'none',
  },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = ORDER_STATUSES;

module.exports = Order;
module.exports.STATUSES = ORDER_STATUSES;
