const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const settingsController = require('./settings.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

const uploadsDir = path.resolve(process.cwd(), 'uploads', 'company');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = (file.originalname || 'branding').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginal}`);
  },
});
const upload = multer({ storage });

router.get('/', protect, authorize('admin'), settingsController.getSettings);
router.put('/', protect, authorize('admin'), settingsController.updateSettings);

router.get('/company-profile', protect, settingsController.getCompanyProfile);
router.put('/company-profile', protect, authorize('admin'), settingsController.updateCompanyProfile);
router.post('/company-profile/logo', protect, authorize('admin'), upload.single('logo'), settingsController.uploadLogo);
router.delete('/company-profile/logo', protect, authorize('admin'), settingsController.removeLogo);
router.post('/company-profile/letterhead', protect, authorize('admin'), upload.single('letterhead'), settingsController.uploadLetterhead);
router.delete('/company-profile/letterhead', protect, authorize('admin'), settingsController.removeLetterhead);

module.exports = router;
