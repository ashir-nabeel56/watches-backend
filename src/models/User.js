import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  fullName: { type: String, trim: true, required: true },
  phone: { type: String, required: true },
  addressLine: { type: String, trim: true, required: true },
  city: { type: String, trim: true, required: true },
  province: { type: String, trim: true, required: true },
  postalCode: { type: String, trim: true, default: '' },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  addresses: { type: [addressSchema], default: [] },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { transform(doc, ret) { delete ret.password; delete ret.__v; return ret; } },
});

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);