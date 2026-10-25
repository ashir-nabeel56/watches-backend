import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return next(new AppError('Login zaroori hai', 401));
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) return next(new AppError('User account active nahi hai', 401));
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findOne({ _id: payload.id, isActive: true });
  }
  next();
});

export function restrictTo(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : next(new AppError('Is action ki ijazat nahi', 403));
}