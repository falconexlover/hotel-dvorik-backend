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

// GET /api/services - Получить все услуги (оставляем публичным)
router.get('/', getAllServices); // Используем импортированную функцию напрямую

// POST /api/services - Создать новую услугу (ВРЕМЕННО без защиты)
router.post('/', createService); // Используем импортированную функцию напрямую

// PUT /api/services/:id - Обновить услугу (ВРЕМЕННО без защиты)
router.put('/:id', updateService); // Используем импортированную функцию напрямую

// DELETE /api/services/:id - Удалить услугу (ВРЕМЕННО без защиты)
router.delete('/:id', deleteService); // Используем импортированную функцию напрямую

module.exports = router; 