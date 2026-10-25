import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  logoUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Brand', schema);