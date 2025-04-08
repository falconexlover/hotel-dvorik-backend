const express = require('express');
const router = express.Router();
const { 
  createBooking,
  getBookingByNumber,
  getAllBookings,
  deleteBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// Создать новое бронирование (делаем публичным)
router.post('/', createBooking);

// Получить бронирование по номеру
router.get('/:bookingNumber', getBookingByNumber);

// Получить все бронирования
router.get('/', protect, getAllBookings);

// Удалить бронирование (используем _id из MongoDB)
router.delete('/:id', protect, deleteBooking);

module.exports = router; 