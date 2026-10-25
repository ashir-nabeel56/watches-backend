import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']); // Google aur Cloudflare DNS

export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error(process.env.MONGODB_URI);
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected:', mongoose.connection.name);
}