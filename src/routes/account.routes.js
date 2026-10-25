import { Router } from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemas } from '../validators/index.js';

const router = Router();
router.use(protect);

router.put('/profile', validate(schemas.profile), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $set: req.body }, { new: true, runValidators: true });
  res.json({ user });
}));

router.post('/change-password', validate(schemas.changePassword), asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) return next(new AppError('Current password galat hai', 400));
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password update ho gaya' });
}));

router.post('/addresses', validate(schemas.address), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.addresses.forEach((address) => { address.isDefault = false; });
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ addresses: user.addresses });
}));

router.delete('/addresses/:addressId', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(new AppError('Address nahi mila', 404));
  address.deleteOne();
  await user.save();
  res.json({ addresses: user.addresses });
}));

router.get('/wishlist', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'wishlist', match: { isActive: true }, populate: [{ path: 'brand', select: 'name slug' }, { path: 'category', select: 'name slug' }] });
  res.json({ items: user.wishlist });
}));

router.post('/wishlist/:productId', asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) return next(new AppError('Product nahi mila', 404));
  const user = await User.findById(req.user._id);
  const exists = user.wishlist.some((id) => String(id) === String(product._id));
  if (exists) user.wishlist.pull(product._id);
  else user.wishlist.addToSet(product._id);
  await user.save();
  res.json({ added: !exists, wishlist: user.wishlist });
}));

export default router;