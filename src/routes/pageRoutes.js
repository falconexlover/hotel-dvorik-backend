console.log("[pageRoutes.js] Файл загружается...");
const express = require('express');
const router = express.Router();
const { getPageContent, updatePageContent } = require('../controllers/pageController');
console.log("[pageRoutes.js] getPageContent импортирован:", typeof getPageContent);
console.log("[pageRoutes.js] updatePageContent импортирован:", typeof updatePageContent);
const { protect, admin } = require('../middleware/authMiddleware');

// Получение контента страницы (доступно всем)
console.log("[pageRoutes.js] Регистрация GET /:pageId");
router.route('/:pageId').get(getPageContent);

// Обновление контента страницы (только админ)
console.log("[pageRoutes.js] Регистрация PUT /:pageId");
router.route('/:pageId').put(/* protect, admin, */ updatePageContent);

console.log("[pageRoutes.js] Маршрутизатор экспортируется.");
module.exports = router; 