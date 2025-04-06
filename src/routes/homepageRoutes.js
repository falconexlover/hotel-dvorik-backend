const express = require('express');
const router = express.Router();
const {
  getHomepage,
  updateHomepage,
} = require('../controllers/homepageController');
const { protect } = require('../middleware/authMiddleware');

// --- Публичный маршрут ---
router.get('/', getHomepage);

// --- Приватный/Админ маршрут ---
router.put('/', protect, updateHomepage);

module.exports = router; 