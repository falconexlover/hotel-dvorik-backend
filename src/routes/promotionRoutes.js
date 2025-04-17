const express = require('express');
const multer = require('multer');
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

// Настройка multer для хранения файла в памяти (буфером)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5MB
  fileFilter: (req, file, cb) => {
    // Простая проверка mimetype
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла! Разрешены только изображения.'), false);
    }
  }
});

// Маршруты для создания и получения всех акций
router.route('/')
  // Защищаем создание акции
  .post(protect, admin, upload.single('image'), createPromotion) 
  // Делаем получение всех акций публичным
  .get(getAllPromotions); 

// Маршруты для конкретной акции по ID
// Защищаем все операции с конкретной акцией
router.route('/:id')
  .get(protect, admin, getPromotionById) 
  .put(protect, admin, upload.single('image'), updatePromotion) 
  .delete(protect, admin, deletePromotion);

module.exports = router; 