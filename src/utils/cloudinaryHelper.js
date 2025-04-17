const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Конфигурация Cloudinary (лучше вынести в .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Использовать HTTPS
});

/**
 * Загружает буфер изображения в Cloudinary
 * @param {Buffer} imageBuffer Буфер изображения
 * @param {string} folder Папка в Cloudinary для сохранения
 * @returns {Promise<object>} Результат загрузки от Cloudinary
 */
const uploadToCloudinary = (imageBuffer, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder, // Указываем папку
        resource_type: 'image', // Указываем тип ресурса
         // Можно добавить другие параметры, например, transformation
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(new Error('Ошибка загрузки в Cloudinary'));
        }
        resolve(result);
      }
    );
    // Преобразуем буфер в поток и передаем в Cloudinary
    streamifier.createReadStream(imageBuffer).pipe(uploadStream);
  });
};

/**
 * Удаляет изображение из Cloudinary по его Public ID
 * @param {string} publicId Public ID изображения в Cloudinary
 * @returns {Promise<object>} Результат удаления от Cloudinary
 */
const deleteFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                 console.error('Cloudinary Delete Error:', error);
                 // Не отклоняем промис, чтобы не прерывать основной процесс,
                 // просто логируем и резолвим с ошибкой
                resolve({ success: false, error });
            } else {
                 resolve(result);
            }
        });
    });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary // Экспортируем настроенный экземпляр, если он нужен где-то еще
}; 