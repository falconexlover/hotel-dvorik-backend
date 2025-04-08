const asyncHandler = require('../middleware/express-async-handler');
const Promotion = require('../models/Promotion');

// @desc    Создать новую акцию
// @route   POST /api/promotions
// @access  Private/Admin
// Возвращаем asyncHandler
const createPromotion = asyncHandler(async (req, res, next) => {
    // TODO: Добавить более строгую валидацию входных данных
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

    const promotion = new Promotion({
      title,
      description,
      discountType,
      discountValue,
      code,
      startDate,
      endDate,
      isActive,
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
    // Обновляем поля из req.body
    promotion.title = req.body.title || promotion.title;
    promotion.description = req.body.description !== undefined ? req.body.description : promotion.description;
    promotion.discountType = req.body.discountType || promotion.discountType;
    promotion.discountValue = req.body.discountValue !== undefined ? req.body.discountValue : promotion.discountValue;
    promotion.code = req.body.code !== undefined ? req.body.code : promotion.code;
    promotion.startDate = req.body.startDate !== undefined ? req.body.startDate : promotion.startDate;
    promotion.endDate = req.body.endDate !== undefined ? req.body.endDate : promotion.endDate;
    promotion.isActive = req.body.isActive !== undefined ? req.body.isActive : promotion.isActive;
    
    // TODO: Добавить более строгую валидацию перед сохранением

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