const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptedFields } = require('../lib/encryption');

const homeAddressSchema = new mongoose.Schema({
  fullName:   { type: String, default: '' },
  address:    { type: String, default: '' },
  city:       { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country:    { type: String, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email:       { type: String, required: true, unique: true },
  username:    { type: String, required: true, unique: true },
  full_name:   { type: String, required: true },
  gender:      { type: String, required: true },
  password:    { type: String, required: true },
  taxId:       { type: String, default: '', trim: true },
  homeAddress: { type: homeAddressSchema, default: () => ({}) },
  role:        { type: String, enum: ['customer', 'product_manager', 'sales_manager'], default: 'customer' },
  created_at:  { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Encrypt sensitive account PII at rest (REQ 16). Passwords are hashed
// separately above; email/username stay queryable for login + uniqueness.
encryptedFields(userSchema, [
  'taxId',
  'homeAddress.fullName',
  'homeAddress.address',
  'homeAddress.city',
  'homeAddress.postalCode',
  'homeAddress.country',
]);

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  }
});

module.exports = mongoose.model('User', userSchema);
