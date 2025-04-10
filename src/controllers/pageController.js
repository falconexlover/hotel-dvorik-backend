const asyncHandler = require('express-async-handler');
const Page = require('../models/Page');

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

module.exports = { getPageContent, updatePageContent }; 