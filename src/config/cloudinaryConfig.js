const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config(); // Убедимся, что переменные окружения загружены

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Используем https
});

// Функция для проверки конфигурации (опционально)
const checkCloudinaryConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("\n*** ОШИБКА: Не заданы все переменные окружения для Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) в .env файле! ***\n");
    // Можно либо выбросить ошибку, либо просто вернуть null/false
    // process.exit(1);
    return false;
  }
  // console.log('Конфигурация Cloudinary загружена.');
  return true;
};

// Проверяем конфигурацию при загрузке модуля
if (!checkCloudinaryConfig()) {
  // Если не настроено, возможно, не экспортируем cloudinary?
  // module.exports = null; // Или оставляем как есть, но upload будет падать
}

module.exports = cloudinary; 