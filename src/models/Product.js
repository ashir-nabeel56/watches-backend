import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
}, { _id: false });

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  color: { type: String, default: '' },
  strap: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: null, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number, default: 3, min: 0 },
  isActive: { type: Boolean, default: true },
});

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  gender: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
  movement: { type: String, enum: ['quartz', 'automatic', 'mechanical', 'digital'], default: 'quartz' },
  caseSizeMm: { type: Number, min: 0, default: null },
  waterResistanceM: { type: Number, min: 0, default: 0 },
  warrantyMonths: { type: Number, min: 0, default: 12 },
  images: { type: [imageSchema], default: [] },
  variants: { type: [variantSchema], required: true, validate: [(items) => items.length > 0, 'Kam az kam aik variant zaroori hai'] },
  minPrice: { type: Number, default: 0 },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ 'variants.sku': 1 }, { unique: true });
schema.pre('save', function computeMinPrice() {
  const prices = this.variants.filter((variant) => variant.isActive).map((variant) => variant.price);
  this.minPrice = prices.length ? Math.min(...prices) : 0;
});

export default mongoose.model('Product', schema);