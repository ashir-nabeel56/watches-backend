import { Router } from 'express';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import { getSetting } from '../models/Setting.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.get('/brands', asyncHandler(async (req, res) => res.json({ items: await Brand.find().sort({ name: 1 }) })));
router.get('/categories', asyncHandler(async (req, res) => res.json({ items: await Category.find().sort({ name: 1 }) })));
router.get('/settings', asyncHandler(async (req, res) => {
  const [shipping, store] = await Promise.all([getSetting('shipping'), getSetting('store')]);
  res.json({ shipping, store });
}));

export default router;