const express = require('express');
const router = express.Router();
const {
  getAllImages,
  getImageById,
  uploadImage,
  updateImage,
  deleteImage,
  updateImageOrder,
} = require('../controllers/galleryController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// TODO: Добавить middleware для обработки загрузки файлов (напр., multer) к маршруту POST /

// --- Публичные маршруты ---
router.get('/', getAllImages);
router.get('/:id', getImageById);

// --- Приватные/Админ маршруты ---
router.put('/order', protect, updateImageOrder);
router.post('/', protect, uploadSingle, uploadImage);
router.put('/:id', protect, updateImage);
router.delete('/:id', protect, deleteImage);

module.exports = router; 