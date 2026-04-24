const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: null },
  serialNumber: { type: String, required: true, unique: true },
  warrantyMonths: { type: Number, default: 0, min: 0 },
  distributorInfo: { type: String, default: '' },
  model: { type: String, default: '' },
  quantityInStock: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Product', productSchema);
