const asyncHandler = require('express-async-handler');
const HomepageContent = require('../models/HomepageContent');

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

module.exports = {
  getHomepage,
  updateHomepage,
}; 