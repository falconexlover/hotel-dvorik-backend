const express = require('express');
const router = express.Router();
const {
  getHomepage,
  updateHomepage,
  uploadHomepageImage,
  addHomepageSectionImage,
  deleteHomepageSectionImage,
} = require('../controllers/homepageController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// --- Публичный маршрут ---
router.get('/', getHomepage);

// --- Приватный/Админ маршрут ---
router.put('/', protect, updateHomepage);

// --- Маршрут загрузки изображения для главной страницы ---
router.post('/image', protect, uploadSingle, uploadHomepageImage);

// --- Маршруты для управления изображениями секций (conference, party) ---
router.post('/section-image', protect, uploadSingle, addHomepageSectionImage);
router.delete('/section-image', protect, deleteHomepageSectionImage);

module.exports = router; 