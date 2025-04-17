const asyncHandler = require('../middleware/express-async-handler');
const Promotion = require('../models/Promotion');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryHelper'); // Путь может отличаться
const { extractPublicId } = require('../utils/helpers'); // Хелпер для извлечения ID из URL Cloudinary

// @desc    Создать новую акцию
// @route   POST /api/promotions
// @access  Private/Admin
// Возвращаем asyncHandler
const createPromotion = asyncHandler(async (req, res, next) => {
    // req.body содержит текстовые поля из FormData
    const { 
      title, 
      description, 
      discountType, 
      discountValue, 
      code, 
      startDate, 
      endDate, 
      isActive 
    } = req.body;

    let imageUrl = '';
    // Проверяем, был ли загружен файл (multer добавляет req.file)
    if (req.file) {
        try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'promotions'); // Загружаем в папку 'promotions'
            imageUrl = uploadResult.secure_url;
        } catch (error) {
            console.error('Ошибка загрузки изображения акции в Cloudinary:', error);
            // Можно вернуть ошибку или продолжить без изображения
            res.status(500);
            throw new Error('Ошибка загрузки изображения');
        }
    }

    // Преобразуем строковое 'true'/'false' обратно в boolean, если нужно
    const promotionIsActive = typeof isActive === 'string' ? isActive.toLowerCase() === 'true' : !!isActive;

    const promotion = new Promotion({
      title,
      description,
      discountType,
      discountValue,
      code,
      startDate: startDate || null, // Устанавливаем null, если дата не передана
      endDate: endDate || null,
      isActive: promotionIsActive, // Используем преобразованное значение
      imageUrl, // Добавляем URL изображения
    });

    const createdPromotion = await promotion.save();
    res.status(201).json(createdPromotion);
});

// @desc    Получить все акции
// @route   GET /api/promotions
// @access  Private/Admin (или Public, если нужно показывать на сайте)
// Возвращаем asyncHandler
const getAllPromotions = asyncHandler(async (req, res) => {
  // TODO: Добавить пагинацию и фильтрацию (например, по isActive)
  const promotions = await Promotion.find({}).sort({ createdAt: -1 }); // Сортируем по дате создания
  res.json(promotions);
});

// @desc    Получить акцию по ID
// @route   GET /api/promotions/:id
// @access  Private/Admin
const getPromotionById = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (promotion) {
    res.json(promotion);
  } else {
    res.status(404);
    throw new Error('Акция не найдена');
  }
});

// @desc    Обновить акцию
// @route   PUT /api/promotions/:id
// @access  Private/Admin
const updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);

  if (promotion) {
    const { 
        title, 
        description, 
        discountType, 
        discountValue, 
        code, 
        startDate, 
        endDate, 
        isActive,
        // Важно: не берем imageUrl из body напрямую, если он не обновляется файлом
    } = req.body;

    let newImageUrl = promotion.imageUrl; // Сохраняем старый URL по умолчанию
    const oldImageUrl = promotion.imageUrl;

    // Проверяем, загружен ли новый файл
    if (req.file) {
        try {
            // Удаляем старое изображение из Cloudinary, если оно было
            if (oldImageUrl) {
                try {
                    const publicId = extractPublicId(oldImageUrl); 
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                } catch (deleteError) {
                    console.error('Не удалось удалить старое изображение из Cloudinary:', deleteError);
                    // Не прерываем процесс, просто логируем ошибку
                }
            }
            
            // Загружаем новое изображение
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'promotions');
            newImageUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error('Ошибка загрузки нового изображения акции в Cloudinary:', uploadError);
            res.status(500);
            throw new Error('Ошибка загрузки нового изображения');
        }
    } else if (req.body.imageUrl === '' || req.body.imageUrl === null) {
         // Если imageUrl пришел пустым (или null), значит пользователь удалил картинку (без загрузки новой)
         // Удаляем старое изображение из Cloudinary, если оно было
         if (oldImageUrl) {
             try {
                 const publicId = extractPublicId(oldImageUrl);
                 if (publicId) {
                     await deleteFromCloudinary(publicId);
                 }
             } catch (deleteError) {
                 console.error('Не удалось удалить старое изображение из Cloudinary:', deleteError);
                 // Не прерываем процесс, просто логируем ошибку
             }
         }
         newImageUrl = ''; // Очищаем URL
    } 
    // Иначе (если файла нет и imageUrl не пустой) - newImageUrl остается старым значением

    // Обновляем поля из req.body
    promotion.title = title || promotion.title;
    promotion.description = description !== undefined ? description : promotion.description;
    promotion.discountType = discountType || promotion.discountType;
    promotion.discountValue = discountValue !== undefined ? Number(discountValue) : promotion.discountValue;
    promotion.code = code !== undefined ? code : promotion.code;
    promotion.startDate = startDate !== undefined ? (startDate || null) : promotion.startDate;
    promotion.endDate = endDate !== undefined ? (endDate || null) : promotion.endDate;
    // Преобразуем строковое 'true'/'false' обратно в boolean, если нужно
    const promotionIsActive = typeof isActive === 'string' ? isActive.toLowerCase() === 'true' : (isActive !== undefined ? !!isActive : promotion.isActive);
    promotion.isActive = promotionIsActive;
    promotion.imageUrl = newImageUrl; // Обновляем URL изображения

    const updatedPromotion = await promotion.save();
    res.json(updatedPromotion);
  } else {
    res.status(404);
    throw new Error('Акция не найдена');
  }
});

// @desc    Удалить акцию
// @route   DELETE /api/promotions/:id
// @access  Private/Admin
const deletePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);

  if (promotion) {
    await promotion.deleteOne(); // Используем deleteOne() 
    res.json({ message: 'Акция удалена' });
  } else {
    res.status(404);
    throw new Error('Акция не найдена');
  }
});

module.exports = {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
}; 