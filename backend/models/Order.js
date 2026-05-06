const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
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
    enum: ['Processing', 'In Transit', 'Delivered'],
    default: 'Processing',
  },
  paymentTransactionId: { type: String, required: true },
  paymentStatus: {
    type: String,
    enum: ['approved', 'declined'],
    default: 'approved',
  },
  paymentCardLast4: { type: String, default: '' },
  paidAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('Order', orderSchema);
