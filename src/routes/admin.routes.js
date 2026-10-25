import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import { getSetting, saveSetting } from '../models/Setting.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemas } from '../validators/index.js';
import { uniqueSlug } from '../utils/slugify.js';
import { escapeRegex, getPaging, pageResult, str } from '../utils/pagination.js';
import { changeOrderStatus } from '../services/orderService.js';

const router = Router();
router.use(protect, restrictTo('staff', 'admin'));
const adminOnly = restrictTo('admin');
const excludedStatuses = ['cancelled', 'returned'];

router.get('/dashboard', asyncHandler(async (req, res) => {
  const now = new Date();
  const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [daily, ordersByStatus, topProducts, lowStockProducts, totalCustomers, todayCount] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: last30Start } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Karachi' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', excludedStatuses] }, 0, '$total'] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $nin: excludedStatuses } } }, { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' } } },
      { $sort: { units: -1 } }, { $limit: 5 },
    ]),
    Product.aggregate([
      { $match: { isActive: true } }, { $unwind: '$variants' }, { $match: { 'variants.isActive': true, $expr: { $lte: ['$variants.stock', '$variants.lowStockThreshold'] } } },
      { $project: { name: 1, slug: 1, variant: '$variants' } }, { $sort: { 'variant.stock': 1 } },
    ]),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments({ createdAt: { $gte: last30Start }, $expr: { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Karachi' } }, dayKey] } }),
  ]);
  const todaySales = daily.find((item) => item._id === dayKey) || { orders: 0, revenue: 0 };
  const last30Days = daily.reduce((sum, item) => ({ orders: sum.orders + item.orders, revenue: sum.revenue + item.revenue }), { orders: 0, revenue: 0 });
  res.json({
    today: { orders: todayCount, revenue: todaySales.revenue }, last30Days,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((entry) => [entry._id, entry.count])),
    dailySales: daily, topProducts, lowStock: lowStockProducts, totalCustomers,
  });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const filter = {};
  const q = str(req.query.q);
  const active = str(req.query.active, 'all');
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (active === 'true' || active === 'false') filter.isActive = active === 'true';
  const paging = getPaging(req.query);
  const [items, total] = await Promise.all([
    Product.find(filter).populate('brand', 'name slug').populate('category', 'name slug').sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    Product.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, paging));
}));

router.get('/products/:id', asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('brand').populate('category');
  if (!product) return next(new AppError('Product nahi mila', 404));
  res.json({ product });
}));

router.post('/products', validate(schemas.product), asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = await uniqueSlug(Product, data.slug || data.name);
  const product = await Product.create(data);
  res.status(201).json({ product });
}));

router.put('/products/:id', validate(schemas.productUpdate), asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product nahi mila', 404));
  const data = { ...req.body };
  if (data.name || data.slug) data.slug = await uniqueSlug(Product, data.slug || data.name, product._id);
  product.set(data);
  await product.save();
  res.json({ product });
}));

router.patch('/products/:id/variants/:variantId/stock', validate(schemas.stock), asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  const variant = product?.variants.id(req.params.variantId);
  if (!variant) return next(new AppError('Product ya variant nahi mila', 404));
  variant.stock = req.body.stock;
  await product.save();
  res.json({ product });
}));

router.delete('/products/:id', adminOnly, asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return next(new AppError('Product nahi mila', 404));
  res.status(204).send();
}));

async function createCatalogItem(Model, body, includeLogo = false) {
  const data = { name: body.name, slug: await uniqueSlug(Model, body.name) };
  if (includeLogo) data.logoUrl = body.logoUrl || '';
  return Model.create(data);
}

async function updateCatalogItem(Model, id, body, includeLogo = false) {
  const doc = await Model.findById(id);
  if (!doc) throw new AppError('Record nahi mila', 404);
  doc.name = body.name;
  doc.slug = await uniqueSlug(Model, body.name, doc._id);
  if (includeLogo) doc.logoUrl = body.logoUrl || '';
  await doc.save();
  return doc;
}

async function deleteCatalogItem(Model, id, field) {
  const doc = await Model.findById(id);
  if (!doc) throw new AppError('Record nahi mila', 404);
  if (await Product.exists({ [field]: doc._id })) throw new AppError('Is record ke products mojood hain', 409);
  await doc.deleteOne();
}

router.post('/brands', validate(schemas.name), asyncHandler(async (req, res) => res.status(201).json({ brand: await createCatalogItem(Brand, req.body, true) })));
router.put('/brands/:id', validate(schemas.name), asyncHandler(async (req, res) => res.json({ brand: await updateCatalogItem(Brand, req.params.id, req.body, true) })));
router.delete('/brands/:id', adminOnly, asyncHandler(async (req, res) => { await deleteCatalogItem(Brand, req.params.id, 'brand'); res.status(204).send(); }));
router.post('/categories', validate(schemas.name), asyncHandler(async (req, res) => res.status(201).json({ category: await createCatalogItem(Category, req.body) })));
router.put('/categories/:id', validate(schemas.name), asyncHandler(async (req, res) => res.json({ category: await updateCatalogItem(Category, req.params.id, req.body) })));
router.delete('/categories/:id', adminOnly, asyncHandler(async (req, res) => { await deleteCatalogItem(Category, req.params.id, 'category'); res.status(204).send(); }));

router.get('/orders', asyncHandler(async (req, res) => {
  const filter = {};
  const status = str(req.query.status);
  const paymentStatus = str(req.query.paymentStatus);
  const q = str(req.query.q);
  if (['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'].includes(status)) filter.status = status;
  if (['unpaid', 'paid', 'refunded'].includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ orderNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
  }
  const paging = getPaging(req.query);
  const [items, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit), Order.countDocuments(filter)]);
  res.json(pageResult(items, total, paging));
}));
router.get('/orders/:id', asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return next(new AppError('Order nahi mila', 404));
  res.json({ order });
}));
router.patch('/orders/:id/status', validate(schemas.orderStatus), asyncHandler(async (req, res) => {
  const { status, courier, trackingNumber } = req.body;
  const order = await changeOrderStatus(req.params.id, status, req.user._id, { courier, trackingNumber });
  res.json({ order });
}));
router.patch('/orders/:id/payment', validate(schemas.payment), asyncHandler(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus: req.body.paymentStatus }, { new: true, runValidators: true });
  if (!order) return next(new AppError('Order nahi mila', 404));
  res.json({ order });
}));

router.get('/customers', asyncHandler(async (req, res) => {
  const paging = getPaging(req.query);
  const q = str(req.query.q);
  const match = { role: 'customer' };
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    match.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  const [items, total] = await Promise.all([
    User.aggregate([
      { $match: match }, { $sort: { createdAt: -1 } }, { $skip: paging.skip }, { $limit: paging.limit },
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'user', as: 'orders' } },
      { $project: { name: 1, email: 1, phone: 1, createdAt: 1, ordersCount: { $size: '$orders' }, totalSpent: { $sum: { $map: { input: { $filter: { input: '$orders', as: 'order', cond: { $not: { $in: ['$$order.status', excludedStatuses] } } }, as: 'order', in: '$$order.total' } } } } } },
    ]), User.countDocuments(match),
  ]);
  res.json(pageResult(items, total, paging));
}));
router.get('/customers/:id/orders', asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
  res.json({ items: orders });
}));

router.get('/coupons', asyncHandler(async (req, res) => {
  const paging = getPaging(req.query);
  const [items, total] = await Promise.all([Coupon.find().sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit), Coupon.countDocuments()]);
  res.json(pageResult(items, total, paging));
}));
router.post('/coupons', validate(schemas.coupon), asyncHandler(async (req, res) => res.status(201).json({ coupon: await Coupon.create(req.body) })));
router.put('/coupons/:id', validate(schemas.coupon), asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) return next(new AppError('Coupon nahi mila', 404));
  res.json({ coupon });
}));
router.delete('/coupons/:id', asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new AppError('Coupon nahi mila', 404));
  res.status(204).send();
}));

router.get('/reviews', asyncHandler(async (req, res) => {
  const paging = getPaging(req.query);
  const approved = str(req.query.approved);
  const filter = {};
  if (approved === 'true' || approved === 'false') filter.isApproved = approved === 'true';
  const [items, total] = await Promise.all([Review.find(filter).populate('product', 'name slug').populate('user', 'name email').sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit), Review.countDocuments(filter)]);
  res.json(pageResult(items, total, paging));
}));
router.patch('/reviews/:id/approve', asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true, runValidators: true });
  if (!review) return next(new AppError('Review nahi mila', 404));
  await Review.refreshProductStats(review.product);
  res.json({ review });
}));
router.delete('/reviews/:id', asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return next(new AppError('Review nahi mila', 404));
  await Review.refreshProductStats(review.product);
  res.status(204).send();
}));

router.patch('/users/:id/role', adminOnly, validate(schemas.role), asyncHandler(async (req, res, next) => {
  if (String(req.params.id) === String(req.user._id)) return next(new AppError('Apna role change nahi kar sakte', 400));
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true });
  if (!user) return next(new AppError('User nahi mila', 404));
  res.json({ user });
}));
router.get('/settings/shipping', adminOnly, asyncHandler(async (req, res) => res.json({ shipping: await getSetting('shipping') })));
router.put('/settings/shipping', adminOnly, validate(schemas.shipping), asyncHandler(async (req, res) => res.json({ shipping: await saveSetting('shipping', req.body) })));

export default router;