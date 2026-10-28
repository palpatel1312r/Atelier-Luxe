import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '..', '..', config.upload.dir);

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

function fileFilter(_req, file, cb) {
  if (config.upload.allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed'), false);
}

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

export { uploadDir };
