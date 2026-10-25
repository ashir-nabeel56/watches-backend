import { Router } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { protect, restrictTo } from '../middleware/auth.js';
import asyncHandler  from '../utils/asyncHandler.js';
import AppError  from '../utils/AppError.js';

// file RAM mein aati hai, phir seedha Cloudinary ko bhej dete hain
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5MB har image, max 8
  fileFilter: (_req, file, cb) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new AppError('Sirf JPG, PNG ya WEBP image allowed hai', 400)),
});

const toCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'watches-store', resource_type: 'image' }, (err, result) =>
        err ? reject(err) : resolve(result)
      )
      .end(buffer);
  });

const router = Router();

// POST /api/admin/upload  (form-data, field ka naam: images)
router.post(
  '/',
  protect,
  restrictTo('staff', 'admin'),
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError('Koi image nahi mili', 400);
    const results = await Promise.all(req.files.map((f) => toCloudinary(f.buffer)));
    res.status(201).json({
      success: true,
      images: results.map((r) => ({ url: r.secure_url, alt: '' })),
    });
  })
);

export default router;