const express = require('express');
const router = express.Router();
const {
  getHomepage,
  updateHomepage,
  uploadHomepageImage,
} = require('../controllers/homepageController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// --- Публичный маршрут ---
router.get('/', getHomepage);

// --- Приватный/Админ маршрут ---
router.put('/', protect, updateHomepage);

// --- Маршрут загрузки изображения для главной страницы ---
router.post('/image', protect, uploadSingle, uploadHomepageImage);

module.exports = router; 