import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

export default mongoose.model('Category', schema);