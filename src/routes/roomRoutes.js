const express = require('express');
const router = express.Router();
const { 
  getRooms,
  getRoomById,
  checkRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle, uploadMultiple } = require('../middleware/uploadMiddleware');

// Получить все комнаты
router.get('/', getRooms);

// Получить комнату по ID
router.get('/:id', getRoomById);

// Проверить доступность комнаты
router.post('/check-availability', checkRoomAvailability);

// Создать новую комнату
router.post('/', protect, uploadMultiple, createRoom);

// Обновить комнату
router.put('/:id', protect, uploadMultiple, updateRoom);

// Удалить комнату
router.delete('/:id', protect, deleteRoom);

module.exports = router; 