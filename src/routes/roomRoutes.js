const express = require('express');
const router = express.Router();
const { 
  getRooms,
  getRoomById,
  checkRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomsOrder
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle, uploadMultiple } = require('../middleware/uploadMiddleware');

// Добавляю парсер обычных полей формы после multer
router.use(express.urlencoded({ extended: true }));

// Получить все комнаты
router.get('/', getRooms);

// Получить комнату по ID
router.get('/:id', getRoomById);

// Проверить доступность комнаты
router.post('/check-availability', checkRoomAvailability);

// Создать новую комнату
router.post('/', protect, uploadMultiple, createRoom);

// Обновить порядок комнат
router.put('/order', protect, updateRoomsOrder);

// Обновить комнату
router.put('/:id', protect, uploadMultiple, updateRoom);

// Удалить комнату
router.delete('/:id', protect, deleteRoom);

module.exports = router; 