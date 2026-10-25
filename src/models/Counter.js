import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
}, { timestamps: true });

schema.statics.nextOrderNumber = async function nextOrderNumber() {
  const counter = await this.findByIdAndUpdate('order', { $inc: { seq: 1 } }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return `WS-${counter.seq}`;
};

export default mongoose.model('Counter', schema);