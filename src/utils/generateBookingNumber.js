/**
 * Генерирует уникальный номер бронирования
 * @returns {string} Номер бронирования в формате BK-XXXXXX
 */
const generateBookingNumber = () => {
  const prefix = 'BK';
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}-${random}`;
};

module.exports = generateBookingNumber; 