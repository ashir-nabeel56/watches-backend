import { Router } from 'express';
import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemas } from '../validators/index.js';
import { escapeRegex, getPaging, pageResult, str } from '../utils/pagination.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const query = req.query;
  const filter = { isActive: true };
  const brand = str(query.brand);
  const category = str(query.category);
  const gender = str(query.gender);
  const movement = str(query.movement);
  const strap = str(query.strap);
  const q = str(query.q);
  const minPrice = str(query.minPrice);
  const maxPrice = str(query.maxPrice);
  const featured = str(query.featured);
  if (brand) {
    const slugs = brand.split(',').map((value) => value.trim()).filter(Boolean);
    const matches = await Brand.find({ slug: { $in: slugs } }).select('_id').lean();
    filter.brand = { $in: matches.map((item) => item._id) };
  }
  if (category) {
    const slugs = category.split(',').map((value) => value.trim()).filter(Boolean);
    const matches = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
    filter.category = { $in: matches.map((item) => item._id) };
  }
  if (gender && ['men', 'women', 'unisex'].includes(gender)) filter.gender = gender;
  if (movement && ['quartz', 'automatic', 'mechanical', 'digital'].includes(movement)) filter.movement = movement;
  const variantFilter = { isActive: true };
  if (strap) variantFilter.strap = { $regex: escapeRegex(strap), $options: 'i' };
  const priceRange = {};
  if (minPrice && Number.isFinite(Number(minPrice))) priceRange.$gte = Number(minPrice);
  if (maxPrice && Number.isFinite(Number(maxPrice))) priceRange.$lte = Number(maxPrice);
  if (Object.keys(priceRange).length) variantFilter.price = priceRange;
  if (strap || Object.keys(priceRange).length) filter.variants = { $elemMatch: variantFilter };
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (featured === 'true') filter.isFeatured = true;
  const sortMap = { newest: { createdAt: -1 }, price_asc: { minPrice: 1 }, price_desc: { minPrice: -1 }, rating: { ratingAvg: -1 } };
  const sort = sortMap[str(query.sort)] || sortMap.newest;
  const paging = getPaging(query);
  const [items, total] = await Promise.all([
    Product.find(filter).populate('brand', 'name slug logoUrl').populate('category', 'name slug').sort(sort).skip(paging.skip).limit(paging.limit),
    Product.countDocuments(filter),
  ]);
  res.json(pageResult(items, total, paging));
}));

router.get('/:slug', asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ slug: str(req.params.slug), isActive: true })
    .populate('brand', 'name slug logoUrl').populate('category', 'name slug');
  if (!product) return next(new AppError('Product nahi mila', 404));
  const [reviews, related] = await Promise.all([
    Review.find({ product: product._id, isApproved: true }).populate('user', 'name').sort({ createdAt: -1 }).limit(20),
    Product.find({ _id: { $ne: product._id }, category: product.category._id, isActive: true }).limit(4).populate('brand', 'name slug').populate('category', 'name slug'),
  ]);
  res.json({ product, reviews, related });
}));

router.post('/:id/reviews', protect, validate(schemas.review), asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) return next(new AppError('Product nahi mila', 404));
  const eligible = await Order.exists({
    user: req.user._id, status: 'delivered', 'items.product': product._id,
  });
  if (!eligible) return next(new AppError('Review ke liye delivered order zaroori hai', 403));
  const review = await Review.create({ ...req.body, product: product._id, user: req.user._id });
  res.status(201).json({ review });
}));

export default router;