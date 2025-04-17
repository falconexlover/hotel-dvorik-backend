const asyncHandler = require('express-async-handler');
const Page = require('../models/Page');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryHelper');
const { extractPublicId } = require('../utils/helpers');

// @route   GET /api/pages/:pageId
// @access  Public
const getPageContent = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  console.log(`[pageController] ===> GET /api/pages/${pageId} `); // Лог входа в контроллер
  
  const page = await Page.findOne({ pageId });

  if (page) {
    console.log(`[pageController] <=== Найдена страница ${pageId}`);
    res.json(page);
  } else {
    console.log(`[pageController] <=== Страница ${pageId} не найдена в БД`);
    res.json({ pageId, content: {} }); 
  }
});

// @desc    Update content for a specific page (or create if not exists)
// @route   PUT /api/pages/:pageId
// @access  Private (Admin only)
const updatePageContent = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { content } = req.body; 
  console.log(`[pageController] ===> PUT /api/pages/${pageId} `); // Лог входа
  console.log("[pageController] Request body content:", content); // Лог контента

  if (content === undefined) {
    res.status(400);
    throw new Error('Content is required in the request body');
  }

  const updatedPage = await Page.findOneAndUpdate(
    { pageId },
    { pageId, content },
    { new: true, upsert: true, runValidators: true }
  );

  if (updatedPage) {
    console.log(`[pageController] <=== Страница ${pageId} обновлена/создана.`);
    res.json(updatedPage);
  } else {
    console.error(`[pageController] <=== ОШИБКА при обновлении страницы ${pageId}`);
    res.status(500);
    throw new Error('Failed to update page content');
  }
});

// @desc    Add image to a page's content array
// @route   POST /api/pages/:pageId/image
// @access  Private/Admin
const addPageImage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  console.log(`[pageController] ===> POST /api/pages/${pageId}/image `);

  if (!req.file) {
    res.status(400);
    throw new Error('Файл изображения не предоставлен');
  }

  const page = await Page.findOne({ pageId });

  if (!page) {
    res.status(404);
    throw new Error('Страница не найдена');
  }

  // Загрузка в Cloudinary
  try {
    const uploadResult = await uploadToCloudinary(req.file.buffer, `page-images/${pageId}`);
    const imageUrl = uploadResult.secure_url;
    const publicId = uploadResult.public_id;

    // Инициализируем content, если его нет (маловероятно из-за Mixed, но на всякий случай)
    if (!page.content || typeof page.content !== 'object') {
        page.content = {};
    }
    // Инициализируем массивы изображений, если их нет
    if (!Array.isArray(page.content.imageUrls)) {
      page.content.imageUrls = [];
    }
    if (!Array.isArray(page.content.cloudinaryPublicIds)) {
      page.content.cloudinaryPublicIds = [];
    }

    // Добавляем новое изображение
    page.content.imageUrls.push(imageUrl);
    page.content.cloudinaryPublicIds.push(publicId);

    // Помечаем поле content как измененное для Mongoose (важно для Mixed типа)
    page.markModified('content');
    
    const updatedPage = await page.save();
    console.log(`[pageController] <=== Изображение добавлено на страницу ${pageId}`);
    res.status(200).json(updatedPage); // Возвращаем обновленный документ страницы

  } catch (error) {
    console.error('[pageController] Ошибка при добавлении изображения:', error);
    res.status(500);
    // Если ошибка произошла после загрузки в Cloudinary, пытаемся удалить
    if (error.public_id) { 
        try { await deleteFromCloudinary(error.public_id); } catch (e) { /* Ignore cleanup error */ }
    }
    throw new Error('Ошибка при добавлении изображения на страницу');
  }
});

// @desc    Delete image from a page's content array
// @route   DELETE /api/pages/:pageId/image
// @access  Private/Admin
const deletePageImage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { publicId } = req.body; // Получаем publicId из тела запроса
  console.log(`[pageController] ===> DELETE /api/pages/${pageId}/image, publicId: ${publicId}`);

  if (!publicId) {
    res.status(400);
    throw new Error('Необходимо указать publicId изображения для удаления');
  }

  const page = await Page.findOne({ pageId });

  if (!page || typeof page.content !== 'object' || !Array.isArray(page.content.cloudinaryPublicIds)) {
    res.status(404);
    throw new Error('Страница или массив изображений не найдены');
  }

  const publicIdIndex = page.content.cloudinaryPublicIds.indexOf(publicId);

  if (publicIdIndex === -1) {
    res.status(404);
    throw new Error('Изображение с указанным publicId не найдено на этой странице');
  }

  // Удаляем из Cloudinary
  try {
    await deleteFromCloudinary(publicId);
  } catch (cloudinaryError) {
     console.error('[pageController] Ошибка удаления из Cloudinary:', cloudinaryError);
     // Можно решить, прерывать ли процесс или нет. Пока прервем.
     res.status(500);
     throw new Error('Ошибка при удалении изображения из Cloudinary');
  }
  
  // Удаляем из массивов в БД
  page.content.imageUrls.splice(publicIdIndex, 1);
  page.content.cloudinaryPublicIds.splice(publicIdIndex, 1);

  // Помечаем поле content как измененное
  page.markModified('content');
  
  try {
    const updatedPage = await page.save();
    console.log(`[pageController] <=== Изображение ${publicId} удалено со страницы ${pageId}`);
    res.status(200).json(updatedPage); // Возвращаем обновленный документ страницы
  } catch (dbError) {
      console.error('[pageController] Ошибка сохранения после удаления:', dbError);
      res.status(500);
      // Попытка отката не имеет смысла, т.к. из Cloudinary уже удалено
      throw new Error('Ошибка сохранения данных после удаления изображения');
  }
});

module.exports = { getPageContent, updatePageContent, addPageImage, deletePageImage }; 