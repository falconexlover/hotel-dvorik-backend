const express = require('express');
const router = express.Router();
const {
  getAllArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadArticleImage,
} = require('../controllers/articleController');
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware'); // Используем настроенный multer

// --- Публичные маршруты --- //
router.route('/')
  .get(getAllArticles); // Получить список всех статей

router.route('/slug/:slug')
  .get(getArticleBySlug); // Получить статью по slug

// --- Маршруты для админки --- //
router.route('/')
  .post(protect, admin, createArticle); // Создать новую статью

router.route('/:id')
  .put(protect, admin, updateArticle) // Обновить статью по ID
  .delete(protect, admin, deleteArticle); // Удалить статью по ID

router.route('/:id/image')
  .post(protect, admin, uploadSingle, uploadArticleImage); // Загрузить/обновить изображение для статьи

module.exports = router; 