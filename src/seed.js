import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Brand from './models/Brand.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import { uniqueSlug } from './utils/slugify.js';

async function seed() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET kam az kam 32 characters ka hona chahiye');
  }
  await connectDB();
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL aur ADMIN_PASSWORD .env mein dein');
  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({ name: 'Store Admin', email: adminEmail, password: process.env.ADMIN_PASSWORD, role: 'admin' });
    console.log('Admin user create ho gaya');
  }

  if (await Product.countDocuments() === 0) {
    const brandData = ['Casio', 'Seiko', 'Citizen'];
    const categoryData = ['Sports', 'Dress', 'Smart'];
    const brands = await Promise.all(brandData.map(async (name) => Brand.findOneAndUpdate(
      { name }, { $setOnInsert: { name, slug: await uniqueSlug(Brand, name) } }, { upsert: true, new: true, setDefaultsOnInsert: true },
    )));
    const categories = await Promise.all(categoryData.map(async (name) => Category.findOneAndUpdate(
      { name }, { $setOnInsert: { name, slug: await uniqueSlug(Category, name) } }, { upsert: true, new: true, setDefaultsOnInsert: true },
    )));
    const samples = [
      { name: 'Casio G-Shock Sport', brand: brands[0], category: categories[0], gender: 'men', movement: 'quartz', caseSizeMm: 45, waterResistanceM: 200, variants: [{ sku: 'CAS-GS-BLK', color: 'Black', strap: 'Resin', price: 18500, stock: 2 }, { sku: 'CAS-GS-RED', color: 'Red', strap: 'Resin', price: 18900, stock: 0 }] },
      { name: 'Seiko Classic Automatic', brand: brands[1], category: categories[1], gender: 'unisex', movement: 'automatic', caseSizeMm: 40, waterResistanceM: 100, variants: [{ sku: 'SEI-CL-SLV', color: 'Silver', strap: 'Steel', price: 42500, stock: 8 }] },
      { name: 'Citizen Eco-Drive Smart', brand: brands[2], category: categories[2], gender: 'women', movement: 'quartz', caseSizeMm: 38, waterResistanceM: 50, variants: [{ sku: 'CIT-ED-GLD', color: 'Gold', strap: 'Leather', price: 35900, stock: 5 }] },
    ];
    for (const [index, item] of samples.entries()) {
      await Product.create({
        ...item, slug: await uniqueSlug(Product, item.name), description: `${item.brand.name} ki premium wrist watch.`,
        images: [{ url: `https://placehold.co/800x800?text=Watch+${index + 1}`, alt: item.name }],
        warrantyMonths: 12, isActive: true, isFeatured: index === 0,
      });
    }
    console.log('3 sample products create ho gaye');
  }
}

seed().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});