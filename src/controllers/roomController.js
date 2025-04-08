const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

// @desc    Получить все комнаты
// @route   GET /api/rooms
// @access  Public
const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({}).sort({ displayOrder: 1, createdAt: -1 });
  res.json(rooms);
});

// @desc    Получить комнату по ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  
  if (room) {
    res.json(room);
  } else {
    res.status(404);
    throw new Error('Комната не найдена');
  }
});

// @desc    Проверить доступность комнаты на определенные даты
// @route   POST /api/rooms/check-availability
// @access  Public
const checkRoomAvailability = asyncHandler(async (req, res) => {
  const { roomId, checkIn, checkOut } = req.body;
  // TODO: Реализовать реальную проверку доступности (например, через связанные бронирования)
  console.log('Checking availability for:', roomId, checkIn, checkOut);
  res.json({
    available: true, // Заглушка
    message: 'Логика проверки доступности не реализована'
  });
});

// Вспомогательная функция для загрузки одного файла в Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "hotel-rooms" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// НОВАЯ Вспомогательная функция для загрузки НЕСКОЛЬКИХ файлов в Cloudinary
const uploadMultipleToCloudinary = async (files) => {
  const uploadPromises = files.map(file => uploadToCloudinary(file.buffer));
  // Выполняем все промисы загрузки параллельно
  const results = await Promise.all(uploadPromises);
  // Возвращаем массив объектов с secure_url и public_id
  return results.map(result => ({ 
    secure_url: result.secure_url, 
    public_id: result.public_id 
  }));
};

// @desc    Создать новую комнату
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = asyncHandler(async (req, res) => {
  // Извлекаем поля из req.body
  const { title, price, capacity, features, pricePerNight, isAvailable } = req.body;

  let processedFeatures = [];
  // Парсим features, если они пришли как JSON строка
  if (features && typeof features === 'string') {
    try {
      const parsedFeatures = JSON.parse(features);
      if (Array.isArray(parsedFeatures)) {
        processedFeatures = parsedFeatures.filter(f => typeof f === 'string');
      }
    } catch (e) {
      console.error('Ошибка парсинга features (createRoom):', e);
      // Можно вернуть ошибку или использовать пустое значение
    }
  }

  let imageUploadResults = [];
  if (req.files && req.files.length > 0) {
    try {
      imageUploadResults = await uploadMultipleToCloudinary(req.files);
    } catch (uploadError) {
      console.error('Cloudinary Upload Error (Create Room):', uploadError);
      res.status(500);
      throw new Error('Ошибка при загрузке изображений комнаты');
    }
  }

  try {
    const newRoom = await Room.create({
      title,
      price,
      // priceValue: priceValue || 0, // Используем pricePerNight
      pricePerNight: pricePerNight || 0,
      capacity: capacity || 1,
      features: processedFeatures,
      imageUrls: imageUploadResults.map(r => r.secure_url),
      cloudinaryPublicIds: imageUploadResults.map(r => r.public_id),
      isAvailable: isAvailable === 'true' || isAvailable === true // Обрабатываем строку 'true'
    });
    res.status(201).json(newRoom);
  } catch (dbError) {
    console.error('Database Save Error (Create Room):', dbError);
    // Если ошибка БД, а файлы загрузились, удаляем их все из Cloudinary
    if (imageUploadResults.length > 0) {
      const deletePromises = imageUploadResults.map(r => cloudinary.uploader.destroy(r.public_id));
      await Promise.all(deletePromises).catch(err => console.error("Ошибка удаления файлов из Cloudinary при откате:", err));
    }
    res.status(500);
    throw new Error('Ошибка при создании комнаты');
  }
});

// @desc    Обновить комнату
// @route   PUT /api/rooms/:id
// @access  Private/Admin
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error('Комната не найдена');
  }

  // Извлекаем поля из req.body
  const { title, price, capacity, features, pricePerNight, isAvailable, deletedImages } = req.body;

  room.title = title || room.title;
  room.price = price || room.price;
  // room.priceValue = priceValue !== undefined ? priceValue : room.priceValue;
  room.pricePerNight = pricePerNight !== undefined ? pricePerNight : room.pricePerNight;
  room.capacity = capacity || room.capacity;
  room.isAvailable = (isAvailable !== undefined) ? (isAvailable === 'true' || isAvailable === true) : room.isAvailable;

  // Обрабатываем features, если пришли как JSON строка
  if (features !== undefined) {
    if (typeof features === 'string') {
        try {
            const parsedFeatures = JSON.parse(features);
             if (Array.isArray(parsedFeatures)) {
                room.features = parsedFeatures.filter(f => typeof f === 'string');
            } else {
                room.features = []; // Если парсинг дал не массив
            }
        } catch (e) {
             console.error('Ошибка парсинга features (updateRoom):', e);
             room.features = []; // Ставим пустой массив при ошибке парсинга
        }
    } else if (Array.isArray(features)) {
        // На случай если вдруг придет как массив (маловероятно с FormData)
        room.features = features.filter(f => typeof f === 'string');
    } else {
        room.features = []; // Сбрасываем, если пришло что-то не то
    }
  }

  // --- Обработка Удаления Старых Изображений ---
  let deletedIdsArray = [];
  if (deletedImages && typeof deletedImages === 'string') {
      try {
          deletedIdsArray = JSON.parse(deletedImages);
          if (!Array.isArray(deletedIdsArray)) { deletedIdsArray = []; }
      } catch (e) {
          console.error('Ошибка парсинга deletedImages:', e);
          deletedIdsArray = [];
      }
  }

  if (deletedIdsArray.length > 0) {
      try {
          // Удаляем файлы из Cloudinary
          const deletePromises = deletedIdsArray.map(publicId => cloudinary.uploader.destroy(publicId));
          await Promise.all(deletePromises);
          console.log('Старые изображения удалены из Cloudinary:', deletedIdsArray);

          // Удаляем ID и URL из массивов в документе комнаты
          room.cloudinaryPublicIds = room.cloudinaryPublicIds?.filter(id => !deletedIdsArray.includes(id));
          // Важно: Синхронно удаляем URL по индексам удаленных ID или по самим URL, если ID нет
          // Этот способ не идеален, если ID могут отсутствовать. Лучше переделать модель?
          // Пока что будем считать, что ID всегда есть и массивы синхронны.
          const urlsToDelete = room.imageUrls?.filter((url, index) => 
              deletedIdsArray.includes(room.cloudinaryPublicIds?.[index] || '')
          );
          room.imageUrls = room.imageUrls?.filter(url => !urlsToDelete?.includes(url));

      } catch (deleteError) {
          console.error('Ошибка при удалении старых изображений:', deleteError);
          // Не прерываем обновление, но логируем ошибку
          toast.warn('Не удалось удалить некоторые старые изображения из хранилища.');
      }
  }
  // --------------------------------------------

  // Обработка новых изображений (если они пришли в req.files)
  if (req.files && Array.isArray(req.files) && req.files.length > 0) { // Убедимся, что req.files это массив
    try {
      // Загружаем новые изображения
      const newImageUploadResults = await uploadMultipleToCloudinary(req.files);
      
      // Добавляем новые URL и ID к существующим массивам
      room.imageUrls = [...(room.imageUrls || []), ...newImageUploadResults.map(r => r.secure_url)];
      room.cloudinaryPublicIds = [...(room.cloudinaryPublicIds || []), ...newImageUploadResults.map(r => r.public_id)];

    } catch (uploadError) {
      console.error('Cloudinary Upload Error (Update Room):', uploadError);
      // Можно решить, прерывать ли обновление или просто сообщить об ошибке
      res.status(500); // Или просто логировать и продолжать
      throw new Error('Ошибка при загрузке новых изображений комнаты');
    }
  }

  // TODO: Добавить логику для УДАЛЕНИЯ существующих изображений, если нужно
  // Например, фронтенд может присылать массив public_id для удаления
  // const { imagesToDelete } = req.body; 
  // if (imagesToDelete && Array.isArray(imagesToDelete)) {
  //   try {
  //      const deletePromises = imagesToDelete.map(publicId => cloudinary.uploader.destroy(publicId));
  //      await Promise.all(deletePromises);
  //      // Удалить соответствующие ID и URL из массивов room.cloudinaryPublicIds и room.imageUrls
  //      room.cloudinaryPublicIds = room.cloudinaryPublicIds.filter(id => !imagesToDelete.includes(id));
  //      // ... аналогично для imageUrls ...
  //   } catch (deleteError) { ... }
  // }

  try {
    const updatedRoom = await room.save();
    res.json(updatedRoom);
  } catch (dbError) {
     console.error('Database Save Error (Update Room):', dbError);
     res.status(500);
     throw new Error('Ошибка при обновлении комнаты');
  }
});

// @desc    Удалить комнату
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
const deleteRoom = asyncHandler(async (req, res) => {
  const roomId = req.params.id; // Получаем ID из параметров

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
     res.status(400);
     throw new Error('Некорректный ID комнаты');
  }

  const room = await Room.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error('Комната не найдена');
  }

  // Удаление всех изображений комнаты из Cloudinary
  if (room.cloudinaryPublicIds && room.cloudinaryPublicIds.length > 0) {
    try {
      // Создаем массив промисов для удаления каждого изображения
      const deletePromises = room.cloudinaryPublicIds.map(publicId => cloudinary.uploader.destroy(publicId));
      await Promise.all(deletePromises); // Выполняем удаление параллельно
    } catch (cloudinaryError) {
      console.error('Cloudinary Delete Error (Delete Room):', cloudinaryError);
      // Можно решить, прерывать ли удаление комнаты или нет
    }
  }

  // Удаление комнаты из БД с использованием deleteOne
  try {
    await Room.deleteOne({ _id: roomId });
    res.json({ message: 'Комната успешно удалена' });
  } catch (dbError) {
    console.error('Database Delete Error (Delete Room):', dbError);
    res.status(500);
    throw new Error('Ошибка при удалении комнаты из базы данных');
  }
});

// @desc    Обновить порядок комнат
// @route   PUT /api/rooms/order
// @access  Private/Admin
const updateRoomsOrder = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body; // Ожидаем массив ID в нужном порядке

  if (!Array.isArray(orderedIds)) {
    res.status(400);
    throw new Error('Ожидался массив orderedIds');
  }

  // Используем транзакцию для атомарности обновления
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatePromises = orderedIds.map((id, index) => 
      Room.findByIdAndUpdate(id, { displayOrder: index }, { session })
    );
    
    await Promise.all(updatePromises);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Порядок комнат успешно обновлен' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Ошибка обновления порядка комнат:", error);
    res.status(500);
    throw new Error('Не удалось обновить порядок комнат');
  }
});

module.exports = {
  getRooms,
  getRoomById,
  checkRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomsOrder
}; 