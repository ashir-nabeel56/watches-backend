import { Router } from 'express';
import Order from '../models/Order.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemas, normalizePakistaniPhone } from '../validators/index.js';
import { placeOrder, changeOrderStatus } from '../services/orderService.js';
import { str } from '../utils/pagination.js';

const router = Router();

router.post('/', optionalAuth, validate(schemas.checkout), asyncHandler(async (req, res) => {
  const order = await placeOrder(req.body, req.user?._id || null);
  res.status(201).json({ order });
}));

router.get('/track', asyncHandler(async (req, res, next) => {
  const orderNumber = str(req.query.orderNumber);
  const phone = normalizePakistaniPhone(str(req.query.phone));
  if (!orderNumber || !/^03\d{9}$/.test(phone)) return next(new AppError('Order number aur valid phone zaroori hain', 400));
  const order = await Order.findOne({ orderNumber, 'customer.phone': phone }).select('orderNumber status statusHistory courier trackingNumber createdAt items');
  if (!order) return next(new AppError('Order nahi mila', 404));
  res.json({ order });
}));

router.get('/my', protect, asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ items: orders });
}));

router.get('/:id', protect, asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order nahi mila', 404));
  if (String(order.user) !== String(req.user._id) && !['staff', 'admin'].includes(req.user.role)) {
    return next(new AppError('Is order ki ijazat nahi', 403));
  }
  res.json({ order });
}));

router.patch('/:id/cancel', protect, asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id, status: 'pending' });
  if (!order) return next(new AppError('Sirf apna pending order cancel kar sakte hain', 409));
  const updated = await changeOrderStatus(order._id, 'cancelled', req.user._id, {}, ['pending']);
  res.json({ order: updated });
}));

export default router;