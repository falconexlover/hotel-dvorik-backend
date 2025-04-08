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
  // Защищаем создание акции
  .post(protect, admin, createPromotion) 
  // Делаем получение всех акций публичным
  .get(getAllPromotions); 

// Маршруты для конкретной акции по ID
// Защищаем все операции с конкретной акцией
router.route('/:id')
  .get(protect, admin, getPromotionById) 
  .put(protect, admin, updatePromotion) 
  .delete(protect, admin, deletePromotion);

module.exports = router; 