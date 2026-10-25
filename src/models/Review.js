import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 1000 },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ product: 1, user: 1 }, { unique: true });
schema.statics.refreshProductStats = async function refreshProductStats(productId) {
  const [stats] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const Product = mongoose.model('Product');
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: stats?.average || 0, ratingCount: stats?.count || 0 } });
};

export default mongoose.model('Review', schema);