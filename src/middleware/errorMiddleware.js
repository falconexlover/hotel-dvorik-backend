const notFound = (req, res, next) => {
  const error = new Error(`Не найдено - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let errorDetails = null; // Для дополнительной информации об ошибках валидации

  // Обработка специфичных ошибок Mongoose
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404; // Или 400, в зависимости от семантики (не найдено или неверный формат)
    message = 'Ресурс не найден (неверный ID)';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Собираем сообщения из всех ошибок валидации
    errorDetails = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    message = 'Ошибка валидации данных';
  }

  // Ошибка дублирования уникального ключа
  if (err.code === 11000) {
    statusCode = 400;
    // Пытаемся извлечь поле, вызвавшее дублирование
    const field = Object.keys(err.keyValue)[0];
    message = `Запись с таким значением '${field}' уже существует.`;
  }

  res.status(statusCode);
  res.json({
    message: message,
    // Добавляем детали валидации, если они есть
    ...(errorDetails && { errors: errorDetails }), 
    // Стек только в режиме разработки
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler }; 