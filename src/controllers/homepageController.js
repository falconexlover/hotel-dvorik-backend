const asyncHandler = require('express-async-handler');
const HomepageContent = require('../models/HomepageContent');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');

// @desc    Получить контент главной страницы
// @route   GET /api/homepage
// @access  Public
const getHomepage = asyncHandler(async (req, res) => {
  const content = await HomepageContent.getSingleton();
  res.json(content);
});

// @desc    Обновить контент главной страницы
// @route   PUT /api/homepage
// @access  Private/Admin
const updateHomepage = asyncHandler(async (req, res) => {
  const content = await HomepageContent.getSingleton();

  // Обновляем поля данными из запроса
  // Пример: Обновляем все поля, переданные в req.body
  Object.assign(content, req.body);

  // Сохраняем изменения
  const updatedContent = await content.save();
  res.json(updatedContent);
});

// @desc    Загрузить изображение для секции главной страницы
// @route   POST /api/homepage/image
// @access  Private/Admin
const uploadHomepageImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Файл изображения не предоставлен');
  }

  const { section } = req.body; // 'banner' или 'about'
  if (!section || (section !== 'banner' && section !== 'about')) {
      res.status(400);
      throw new Error('Необходимо указать корректную секцию (section: "banner" или "about") в теле запроса.');
  }

  const content = await HomepageContent.getSingleton();
  const oldPublicId = content[section]?.imagePublicId;

  // Загрузка в Cloudinary из буфера
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: "homepage-images" }, // Папка для изображений главной страницы
    async (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error:', error);
        res.status(500);
        throw new Error('Ошибка при загрузке изображения в Cloudinary');
      }

      // Обновление записи в БД
      try {
        if (!content[section]) {
            content[section] = {}; // Инициализируем секцию, если ее нет
        }
        content[section].image = result.secure_url;
        content[section].imagePublicId = result.public_id;
        
        const updatedContent = await content.save();

        // Удаление старого изображения из Cloudinary после успешного сохранения нового
        if (oldPublicId && oldPublicId !== result.public_id) {
            try {
                console.log(`Удаление старого изображения (${section}):`, oldPublicId);
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (deleteError) {
                console.error(`Ошибка удаления старого изображения (${section}) из Cloudinary:`, deleteError);
                // Не фатально, просто логируем
            }
        }
        
        res.status(200).json(updatedContent); // Возвращаем обновленный контент

      } catch (dbError) {
        // Если ошибка БД, пытаемся удалить уже загруженное изображение из Cloudinary
        console.error('Database Save Error:', dbError);
        try {
          await cloudinary.uploader.destroy(result.public_id);
        } catch (cleanupError) {
          console.error('Cloudinary cleanup error after DB error:', cleanupError);
        }
        res.status(500);
        throw new Error('Ошибка при сохранении информации об изображении в БД');
      }
    }
  );

  // Передача буфера файла в поток Cloudinary
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

module.exports = {
  getHomepage,
  updateHomepage,
  uploadHomepageImage,
}; 