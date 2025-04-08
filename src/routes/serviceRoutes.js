const express = require('express');
const router = express.Router();
// Импортируем функции контроллера напрямую через деструктуризацию
const {
    getAllServices,
    createService,
    updateService,
    deleteService
} = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const { protect } = require('../middleware/authMiddleware'); // Используем protect напрямую

// GET /api/services - Получить все услуги (оставляем публичным)
router.get('/', getAllServices); // Используем импортированную функцию напрямую

// POST /api/services - Создать новую услугу (Защищено)
router.post('/', protect, createService); 

// PUT /api/services/:id - Обновить услугу (Защищено)
router.put('/:id', protect, updateService); 

// DELETE /api/services/:id - Удалить услугу (Защищено)
router.delete('/:id', protect, deleteService); 

module.exports = router; 