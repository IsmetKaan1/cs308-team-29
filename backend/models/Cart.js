const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 1 }
});

const cartSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  items: [cartItemSchema]
});

module.exports = mongoose.model('Cart', cartSchema);
