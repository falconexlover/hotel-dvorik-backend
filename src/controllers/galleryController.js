const asyncHandler = require('express-async-handler');
const GalleryImage = require('../models/GalleryImage');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier'); // Для потоковой передачи буфера в Cloudinary
// TODO: Понадобится настроить хранение файлов (multer, cloudinary, etc.)

// @desc    Получить все изображения (опционально по категории)
// @route   GET /api/gallery
// @route   GET /api/gallery?category=...
// @access  Public
const getAllImages = asyncHandler(async (req, res) => {
  const category = req.query.category ? { category: req.query.category } : {};
  const images = await GalleryImage.find({ ...category }).sort({ createdAt: -1 }); // Сортировка по новым
  res.json(images);
});

// @desc    Получить изображение по ID
// @route   GET /api/gallery/:id
// @access  Public
const getImageById = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (image) {
    res.json(image);
  } else {
    res.status(404);
    throw new Error('Изображение не найдено');
  }
  // res.status(501).json({ message: 'Get image by ID route not implemented yet' });
});

// @desc    Загрузить новое изображение
// @route   POST /api/gallery
// @access  Private/Admin
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Файл изображения не предоставлен');
  }

  const { category, description } = req.body;

  // Жёсткая проверка категории
  const allowedCategories = ['rooms', 'sauna', 'conference', 'territory', 'party', 'food'];
  if (!category || !allowedCategories.includes(category)) {
    res.status(400);
    throw new Error('Категория обязательна и должна быть одной из: ' + allowedCategories.join(', '));
  }

  // Загрузка в Cloudinary из буфера
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: "hotel-gallery" }, // Опционально: папка в Cloudinary
    async (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error:', error);
        res.status(500);
        throw new Error('Ошибка при загрузке изображения');
      }

      // Создание записи в БД
      try {
        const newImage = await GalleryImage.create({
          imageUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          category: category,
          description: description || '',
        });
        res.status(201).json(newImage);
      } catch (dbError) {
        // Если ошибка БД, пытаемся удалить уже загруженное изображение из Cloudinary
        console.error('Database Save Error:', dbError);
        await cloudinary.uploader.destroy(result.public_id);
        res.status(500);
        throw new Error('Ошибка при сохранении информации об изображении');
      }
    }
  );

  // Передача буфера файла в поток Cloudinary
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// @desc    Обновить информацию об изображении (без замены файла)
// @route   PUT /api/gallery/:id
// @access  Private/Admin
const updateImage = asyncHandler(async (req, res) => {
  const { category, description } = req.body;

  const image = await GalleryImage.findById(req.params.id);

  if (!image) {
    res.status(404);
    throw new Error('Изображение не найдено');
  }

  image.category = category || image.category;
  image.description = description !== undefined ? description : image.description;

  const updatedImage = await image.save();
  res.json(updatedImage);
});

// @desc    Удалить изображение
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
const deleteImage = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);

  if (!image) {
    res.status(404);
    throw new Error('Изображение не найдено');
  }

  // Удаление из Cloudinary (если есть public_id)
  if (image.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(image.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary Delete Error:', cloudinaryError);
      // Продолжаем удаление из БД, но логируем ошибку Cloudinary
    }
  }

  // Удаление из БД
  await image.remove(); // Используем remove() для срабатывания middleware (если есть)

  res.json({ message: 'Изображение успешно удалено' });
});

// @desc    Обновить порядок изображений
// @route   PUT /api/gallery/order
// @access  Private/Admin
const updateImageOrder = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body; // Массив ID в новом порядке

  // Добавляем лог для отладки
  console.log('Received request to update image order:', req.body);
  console.log('Ordered IDs:', orderedIds);

  if (!Array.isArray(orderedIds)) {
    res.status(400);
    throw new Error('Ожидался массив ID изображений (orderedIds).');
  }

  try {
    // Создаем массив операций для bulkWrite
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder: index } },
      },
    }));

    // Выполняем операции одним запросом
    const result = await GalleryImage.bulkWrite(bulkOps);

    // Проверяем результат (опционально)
    console.log('Bulk write result:', result);

    res.status(200).json({ message: 'Порядок изображений успешно обновлен', modifiedCount: result.modifiedCount });

  } catch (error) {
    console.error('Ошибка обновления порядка изображений:', error);
    res.status(500);
    throw new Error('Не удалось обновить порядок изображений.');
  }
});

module.exports = {
  getAllImages,
  getImageById,
  uploadImage,
  updateImage,
  deleteImage,
  updateImageOrder,
}; 