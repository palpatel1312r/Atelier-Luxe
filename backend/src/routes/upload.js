import { Router } from 'express';
import { adminRequired } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

router.post(
  '/',
  adminRequired,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No file uploaded');
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, path: url });
  })
);

router.post(
  '/multiple',
  adminRequired,
  upload.array('images[]', 8),
  asyncHandler(async (req, res) => {
    const paths = (req.files || []).map((f) => `/uploads/${f.filename}`);
    res.json({ paths });
  })
);

export default router;
