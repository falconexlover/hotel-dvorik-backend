const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Функция для генерации JWT токена
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Токен будет действителен 30 дней
  });
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error('Пожалуйста, укажите имя пользователя и пароль');
  }

  // Ищем пользователя в базе данных
  const user = await User.findOne({ username });

  // Проверяем пользователя и пароль
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id),
      expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 дней в миллисекундах (как ожидает фронтенд)
    });
  } else {
    res.status(401); // Unauthorized
    throw new Error('Неверное имя пользователя или пароль');
  }
});

// @desc    Verify token and get user data
// @route   GET /api/auth/verify
// @access  Private (Uses protect middleware)
const verifyToken = asyncHandler(async (req, res) => {
  // Если protect middleware отработал успешно, req.user будет содержать данные пользователя
  if (req.user) {
    res.json({
      _id: req.user._id,
      username: req.user.username,
      isAdmin: req.user.isAdmin
    });
  } else {
    // Эта ситуация не должна произойти, если protect используется правильно
    res.status(401);
    throw new Error('Не удалось верифицировать пользователя');
  }
});

module.exports = {
  loginUser,
  verifyToken,
}; 