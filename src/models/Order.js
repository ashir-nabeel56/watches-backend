import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  image: { type: String, default: '' },
  color: { type: String, default: '' },
  strap: { type: String, default: '' },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

const schema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customer: {
    name: { type: String, required: true }, email: { type: String, required: true }, phone: { type: String, required: true },
  },
  shippingAddress: {
    addressLine: { type: String, required: true }, city: { type: String, required: true },
    province: { type: String, required: true }, postalCode: { type: String, default: '' },
  },
  items: { type: [itemSchema], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'], default: 'pending' },
  statusHistory: { type: [statusHistorySchema], default: [] },
  paymentMethod: { type: String, enum: ['cod', 'bank_transfer', 'jazzcash', 'easypaisa', 'card'], default: 'cod' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  subtotal: { type: Number, required: true }, discount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 }, total: { type: Number, required: true },
  couponCode: { type: String, default: '' }, courier: { type: String, default: '' },
  trackingNumber: { type: String, default: '' }, notes: { type: String, default: '' },
}, { timestamps: true });

schema.index({ createdAt: -1 });
export default mongoose.model('Order', schema);