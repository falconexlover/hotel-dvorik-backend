const express = require('express');
const router = express.Router();
// Импортируем функции контроллера через деструктуризацию
const {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
} = require('../controllers/promotionController'); 
const { protect, admin } = require('../middleware/authMiddleware');

// Маршруты для создания и получения всех акций
router.route('/')
  .post(createPromotion) // <<< Временно убираем protect и admin
  .get(protect, admin, getAllPromotions); // Используем импортированную функцию
  // Если нужно публично показывать акции, можно добавить отдельный .get('/', getAllActivePromotions) в контроллере и роуте

// Маршруты для конкретной акции по ID
router.route('/:id')
  .get(protect, admin, getPromotionById) // Используем импортированную функцию
  .put(protect, admin, updatePromotion) // Используем импортированную функцию
  .delete(protect, admin, deletePromotion); // Используем импортированную функцию

module.exports = router; 