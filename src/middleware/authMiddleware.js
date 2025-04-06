const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Проверяем наличие заголовка Authorization и его формат (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Получаем токен из заголовка
      token = req.headers.authorization.split(' ')[1];

      // Верифицируем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Находим пользователя по ID из токена и добавляем его в объект запроса (req)
      // Исключаем поле password из объекта пользователя
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
         res.status(401);
         throw new Error('Пользователь не найден');
      }

      next(); // Переходим к следующему middleware или обработчику маршрута
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      res.status(401); // Unauthorized
      throw new Error(`Нет авторизации, токен недействителен: ${error.message}`);
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Нет авторизации, токен отсутствует');
  }
});

module.exports = { protect }; 