/**
 * Обертка для асинхронных обработчиков, которая ловит ошибки и передает их в middleware
 * @param {Function} fn - Асинхронная функция-обработчик
 * @returns {Function} Обработчик Express с поймкой ошибок
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler; 