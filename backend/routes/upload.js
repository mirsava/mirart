import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { ALLOWED_IMAGE_TYPES, uploadImage } from '../services/storage.js';

const router = express.Router();

router.use(requireAuth);

// Images are held in memory just long enough to hand them to Supabase Storage (the server disk is not persistent).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'));
  },
});

const toResponse = (file, stored) => ({
  url: stored.url,
  filename: stored.path,
  originalName: file.originalname,
  size: file.size,
});

// Run multer and turn its errors (wrong type, too large, too many files) into 400 responses.
const accept = (middleware) => (req, res, next) =>
  middleware(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 10MB or smaller' : error.message;
    res.status(400).json({ error: message });
  });

// Upload single image
router.post('/image', accept(upload.single('image')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const stored = await uploadImage({ buffer: req.file.buffer, mimetype: req.file.mimetype, folder: req.auth.authUserId });
    res.json(toResponse(req.file, stored));
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload multiple images (up to 10)
router.post('/images', accept(upload.array('images', 10)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const files = [];
    for (const file of req.files) {
      const stored = await uploadImage({ buffer: file.buffer, mimetype: file.mimetype, folder: req.auth.authUserId });
      files.push(toResponse(file, stored));
    }
    res.json({ files });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

export default router;
