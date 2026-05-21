const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PRODUCT_CATEGORIES = [
  'Programming',
  'Algorithms',
  'Systems',
  'Software Engineering',
  'AI & Data Science',
];

const DEFAULT_PACKAGE_CONTENTS = [
  'Course videos on an encrypted USB drive',
  'Printed course handbook',
  'Course notes booklet',
  'Gift mousepad',
];

const productSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, default: 0, min: 0 },
  discountRate: { type: Number, default: 0, min: 0, max: 90 },
  discountStartedAt: { type: Date, default: null },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  stock: { type: Number, default: null },
  serialNumber: { type: String, required: true, unique: true },
  warrantyMonths: { type: Number, required: true, min: 0 },
  distributorInfo: { type: String, required: true, trim: true, minlength: 1 },
  model: { type: String, required: true, trim: true, minlength: 1 },
  quantityInStock: { type: Number, required: true, min: 0 },
  packageContents: {
    type: [String],
    default: () => [...DEFAULT_PACKAGE_CONTENTS],
  },
  cartAddCount: { type: Number, default: 0, min: 0, index: true },
  createdAt: { type: Date, default: Date.now },
});

function computeDiscountedPrice(price, rate) {
  const r = Number(rate) || 0;
  const p = Number(price) || 0;
  if (r <= 0) return p;
  return Math.round((p * (100 - r)) / 100 * 100) / 100;
}

productSchema.virtual('discountedPrice').get(function () {
  return computeDiscountedPrice(this.price, this.discountRate);
});

productSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.warrantyStatus = ret.warrantyMonths > 0 ? 'under-warranty' : 'no-warranty';
    ret.discountedPrice = computeDiscountedPrice(ret.price, ret.discountRate);
    delete ret._id;
    delete ret.__v;
  }
});

const Product = mongoose.model('Product', productSchema);
Product.CATEGORIES = PRODUCT_CATEGORIES;
Product.DEFAULT_PACKAGE_CONTENTS = DEFAULT_PACKAGE_CONTENTS;
Product.computeDiscountedPrice = computeDiscountedPrice;

module.exports = Product;
module.exports.CATEGORIES = PRODUCT_CATEGORIES;
module.exports.DEFAULT_PACKAGE_CONTENTS = DEFAULT_PACKAGE_CONTENTS;
module.exports.computeDiscountedPrice = computeDiscountedPrice;
