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

// @desc    Добавить изображение в массив секции (conference, party)
// @route   POST /api/homepage/section-image
// @access  Private/Admin
const addHomepageSectionImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Файл изображения не предоставлен');
  }

  const { section } = req.body; // 'conference' или 'party'
  if (!section || (section !== 'conference' && section !== 'party')) {
      res.status(400);
      throw new Error('Необходимо указать корректную секцию (section: "conference" или "party") в теле запроса.');
  }

  const content = await HomepageContent.getSingleton();

  // Загрузка в Cloudinary
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: `homepage-${section}` }, // Папка типа homepage-conference
    async (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error (Section Image):', error);
        res.status(500);
        throw new Error('Ошибка при загрузке изображения секции');
      }

      try {
        if (!content[section]) {
            content[section] = { imageUrls: [], cloudinaryPublicIds: [] }; // Инициализируем секцию, если ее нет
        }
        // Гарантируем, что массивы существуют
        if (!Array.isArray(content[section].imageUrls)) content[section].imageUrls = [];
        if (!Array.isArray(content[section].cloudinaryPublicIds)) content[section].cloudinaryPublicIds = [];

        content[section].imageUrls.push(result.secure_url);
        content[section].cloudinaryPublicIds.push(result.public_id);
        
        const updatedContent = await content.save();
        res.status(200).json(updatedContent[section]); // Возвращаем обновленную секцию

      } catch (dbError) {
        console.error('Database Save Error (Section Image):', dbError);
        try {
          await cloudinary.uploader.destroy(result.public_id);
        } catch (cleanupError) {
          console.error('Cloudinary cleanup error (Section Image) after DB error:', cleanupError);
        }
        res.status(500);
        throw new Error('Ошибка при сохранении информации об изображении секции');
      }
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// @desc    Удалить изображение из массива секции (conference, party)
// @route   DELETE /api/homepage/section-image
// @access  Private/Admin
const deleteHomepageSectionImage = asyncHandler(async (req, res) => {
  const { section, publicId } = req.body; // publicId изображения для удаления

  if (!section || (section !== 'conference' && section !== 'party')) {
      res.status(400);
      throw new Error('Необходимо указать корректную секцию (section: "conference" или "party")');
  }
  if (!publicId) {
      res.status(400);
      throw new Error('Необходимо указать publicId изображения для удаления');
  }

  const content = await HomepageContent.getSingleton();

  if (!content[section] || !Array.isArray(content[section].cloudinaryPublicIds)) {
      res.status(404);
      throw new Error('Секция или массив изображений не найдены');
  }

  const publicIdIndex = content[section].cloudinaryPublicIds.indexOf(publicId);

  if (publicIdIndex === -1) {
      res.status(404);
      throw new Error('Изображение с указанным publicId не найдено в этой секции');
  }

  try {
    // Удаляем из Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Удаляем из массивов в БД
    content[section].imageUrls.splice(publicIdIndex, 1);
    content[section].cloudinaryPublicIds.splice(publicIdIndex, 1);

    const updatedContent = await content.save();
    res.status(200).json(updatedContent[section]); // Возвращаем обновленную секцию

  } catch (error) {
    console.error('Ошибка при удалении изображения секции:', error);
    // Пытаемся сохранить контент, даже если удаление из Cloudinary не удалось?
    // Или откатить изменения? Пока просто возвращаем ошибку
    res.status(500);
    throw new Error('Ошибка при удалении изображения секции');
  }
});

module.exports = {
  getHomepage,
  updateHomepage,
  uploadHomepageImage,
  addHomepageSectionImage,
  deleteHomepageSectionImage,
}; 