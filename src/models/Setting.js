import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

const defaults = {
  shipping: { flatRate: 250, freeAbove: 15000 },
  store: { name: 'Watches Store', currency: 'PKR', whatsapp: '' },
};

export async function getSetting(key) {
  const setting = await mongoose.model('Setting').findOne({ key }).lean();
  return setting?.value ?? defaults[key] ?? null;
}

export async function saveSetting(key, value) {
  const setting = await mongoose.model('Setting').findOneAndUpdate(
    { key }, { $set: { value } }, { new: true, upsert: true, runValidators: true },
  );
  return setting.value;
}

export default mongoose.model('Setting', schema);