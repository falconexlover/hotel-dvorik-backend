const express = require('express');
const router = express.Router();
const { loginUser, verifyToken } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);

// Новый маршрут для проверки токена
router.get('/verify', protect, verifyToken);

module.exports = router; 