import { Router } from 'express';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect, signToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemas } from '../validators/index.js';

const router = Router();

router.post('/register', validate(schemas.register), asyncHandler(async (req, res) => {
  const user = await User.create({ ...req.body, role: 'customer' });
  res.status(201).json({ user, token: signToken(user._id) });
}));

router.post('/login', validate(schemas.login), asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) {
    return next(new AppError('Email ya password galat hai', 401));
  }
  res.json({ user, token: signToken(user._id) });
}));

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

export default router;