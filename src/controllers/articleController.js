const asyncHandler = require('../middleware/express-async-handler');
const Article = require('../models/Article');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

// --- Функции для публичного доступа --- //

// @desc    Получить все статьи (публикации)
// @route   GET /api/articles
// @access  Public
const getAllArticles = asyncHandler(async (req, res) => {
  // TODO: Добавить пагинацию, если нужно
  const articles = await Article.find({}).sort({ createdAt: -1 }); // Сортировка по дате создания (сначала новые)
  res.json(articles);
});

// @desc    Получить одну статью по ее slug
// @route   GET /api/articles/slug/:slug
// @access  Public
const getArticleBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  if (!slug) {
      res.status(400);
      throw new Error('Slug статьи не указан');
  }
  
  const article = await Article.findOne({ slug: slug.toLowerCase() });
  
  if (article) {
    res.json(article);
  } else {
    res.status(404);
    throw new Error('Статья не найдена');
  }
});

// --- Функции для админ-панели --- //

// @desc    Создать новую статью
// @route   POST /api/articles
// @access  Private/Admin
const createArticle = asyncHandler(async (req, res) => {
  const { title, content, contentBlocks, excerpt, author, category, tags } = req.body;

  // contentBlocks может прийти как строка (если FormData)
  let parsedBlocks = contentBlocks;
  if (typeof contentBlocks === 'string') {
    try {
      parsedBlocks = JSON.parse(contentBlocks);
    } catch {
      parsedBlocks = [];
    }
  }

  if (!title || (!content && (!parsedBlocks || !Array.isArray(parsedBlocks) || parsedBlocks.length === 0))) {
    res.status(400);
    throw new Error('Заголовок и текст статьи обязательны');
  }

  let imageUrl = '';
  let imagePublicId = '';

  // Если есть файл, загружаем в Cloudinary
  if (req.file) {
    const uploadFromBuffer = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'article-images' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };
    try {
      const result = await uploadFromBuffer();
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    } catch (err) {
      res.status(500);
      throw new Error('Ошибка загрузки изображения статьи');
    }
  }

  try {
    // Удаляем slug из req.body, если он есть, чтобы не мешать автогенерации
    if ('slug' in req.body) delete req.body.slug;
    const newArticle = await Article.create({
      title,
      content: content || (Array.isArray(parsedBlocks) ? (parsedBlocks.find(b => b.type === 'intro')?.text || '') : ''),
      contentBlocks: parsedBlocks || [],
      excerpt: excerpt || '',
      author: author || 'Администратор',
      imageUrl,
      imagePublicId,
      // category,
      // tags
    });
    res.status(201).json(newArticle);
  } catch (error) {
    // Обработка ошибок валидации Mongoose или ошибки уникальности slug
    if (error.code === 11000 || error.name === 'ValidationError') {
      res.status(400);
      // Возвращаем более понятное сообщение
      if (error.code === 11000 && error.keyValue && error.keyValue.slug) {
           throw new Error('Статья с таким заголовком (slug) уже существует.');
      } else if (error.errors) {
           const messages = Object.values(error.errors).map(val => val.message);
           throw new Error(messages.join('. '));
      } else {
           throw new Error('Ошибка валидации данных статьи.');
      }
    } else {
      res.status(500);
      console.error("Ошибка создания статьи:", error);
      throw new Error('Внутренняя ошибка сервера при создании статьи.');
    }
  }
});

// @desc    Обновить статью по ID
// @route   PUT /api/articles/:id
// @access  Private/Admin
const updateArticle = asyncHandler(async (req, res) => {
  const { title, content, excerpt, author, category, tags } = req.body;
  const articleId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(articleId)) {
      res.status(400);
      throw new Error('Некорректный ID статьи');
  }

  const article = await Article.findById(articleId);

  if (!article) {
    res.status(404);
    throw new Error('Статья не найдена');
  }

  // Обновляем поля
  article.title = title || article.title;
  article.content = content || article.content;
  article.excerpt = excerpt !== undefined ? excerpt : article.excerpt;
  article.author = author !== undefined ? author : article.author;
  // article.category = category;
  // article.tags = tags;
  // Если slug отсутствует (например, у старых статей), генерируем его
  if (!article.slug && article.title) {
    article.slug = require('../models/Article').generateSlug(article.title);
  }

  try {
    const updatedArticle = await article.save();
    res.json(updatedArticle);
  } catch (error) {
     // Обработка ошибок валидации Mongoose или ошибки уникальности slug
    if (error.code === 11000 || error.name === 'ValidationError') {
      res.status(400);
      // Возвращаем более понятное сообщение
      if (error.code === 11000 && error.keyValue && error.keyValue.slug) {
           throw new Error('Статья с таким заголовком (slug) уже существует.');
      } else if (error.errors) {
           const messages = Object.values(error.errors).map(val => val.message);
           throw new Error(messages.join('. '));
      } else {
           throw new Error('Ошибка валидации данных статьи.');
      }
    } else {
      res.status(500);
      console.error("Ошибка обновления статьи:", error);
      throw new Error('Внутренняя ошибка сервера при обновлении статьи.');
    }
  }
});

// @desc    Удалить статью по ID
// @route   DELETE /api/articles/:id
// @access  Private/Admin
const deleteArticle = asyncHandler(async (req, res) => {
  const articleId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(articleId)) {
      res.status(400);
      throw new Error('Некорректный ID статьи');
  }

  const article = await Article.findById(articleId);

  if (article) {
    const imagePublicId = article.imagePublicId;
    
    await article.remove(); // Удаляем статью из БД

    // Удаляем связанное изображение из Cloudinary, если оно было
    if (imagePublicId) {
      try {
        console.log(`Удаление изображения статьи (${articleId}):`, imagePublicId);
        await cloudinary.uploader.destroy(imagePublicId);
      } catch (deleteError) {
        console.error(`Ошибка удаления изображения статьи (${articleId}) из Cloudinary:`, deleteError);
        // Не фатально, просто логируем
      }
    }

    res.json({ message: 'Статья успешно удалена' });
  } else {
    res.status(404);
    throw new Error('Статья не найдена');
  }
});

// @desc    Загрузить/обновить изображение для статьи
// @route   POST /api/articles/:id/image
// @access  Private/Admin
const uploadArticleImage = asyncHandler(async (req, res) => {
  const articleId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(articleId)) {
      res.status(400);
      throw new Error('Некорректный ID статьи');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Файл изображения не предоставлен');
  }

  const article = await Article.findById(articleId);
  if (!article) {
    res.status(404);
    throw new Error('Статья не найдена');
  }
  
  const oldPublicId = article.imagePublicId;

  // Загрузка в Cloudinary из буфера
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: "article-images" }, // Папка для изображений статей
    async (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error (Article):', error);
        res.status(500);
        throw new Error('Ошибка при загрузке изображения статьи');
      }

      // Обновление записи в БД
      try {
        article.imageUrl = result.secure_url;
        article.imagePublicId = result.public_id;
        
        const updatedArticle = await article.save();

        // Удаление старого изображения из Cloudinary
        if (oldPublicId && oldPublicId !== result.public_id) {
            try {
                console.log(`Удаление старого изображения статьи (${articleId}):`, oldPublicId);
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (deleteError) {
                console.error(`Ошибка удаления старого изображения статьи (${articleId}) из Cloudinary:`, deleteError);
            }
        }
        
        res.status(200).json(updatedArticle); // Возвращаем обновленную статью

      } catch (dbError) {
        // Если ошибка БД, пытаемся удалить уже загруженное изображение
        console.error('Database Save Error (Article Image):', dbError);
        try {
          await cloudinary.uploader.destroy(result.public_id);
        } catch (cleanupError) {
          console.error('Cloudinary cleanup error (Article Image) after DB error:', cleanupError);
        }
        res.status(500);
        throw new Error('Ошибка при сохранении информации об изображении статьи');
      }
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});


module.exports = {
  getAllArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadArticleImage,
}; 