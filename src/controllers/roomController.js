const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

// @desc    Получить все комнаты
// @route   GET /api/rooms
// @access  Public
const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({})
    .select('_id title price pricePerNight capacity features imageUrls isAvailable displayOrder description fullDescription')
    .sort({ displayOrder: 1, createdAt: -1 });
  res.json(rooms);
});

// @desc    Получить комнату по ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  
  if (room) {
    console.log(`[getRoomById] Sending room data for ID ${req.params.id}:`, {
        imageUrls: room.imageUrls,
        cloudinaryPublicIds: room.cloudinaryPublicIds
    });
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

// Вспомогательная функция для извлечения publicId из URL Cloudinary
const extractPublicIdFromUrl = (url) => {
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    // Ищем ID после версии (vXXXXXXX) и перед расширением
    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
       // Собираем части ID, которые могут содержать '/'
       const potentialIdParts = urlParts.slice(uploadIndex + 2);
       let publicId = potentialIdParts.join('/');
       // Убираем расширение файла
       const lastDotIndex = publicId.lastIndexOf('.');
       if (lastDotIndex !== -1) {
           publicId = publicId.substring(0, lastDotIndex);
       }
       return publicId;
    }
  } catch (e) {
    console.error("Ошибка извлечения publicId из URL:", url, e);
  }
  return null;
};

// @desc    Создать новую комнату
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = asyncHandler(async (req, res) => {
  const { title, price, capacity, features, pricePerNight, isAvailable, description, fullDescription } = req.body;

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
      pricePerNight: pricePerNight || 0,
      capacity: capacity || 1,
      features: processedFeatures,
      description: description || '',
      fullDescription: fullDescription || '',
      imageUrls: imageUploadResults.map(r => r.secure_url),
      cloudinaryPublicIds: imageUploadResults.map(r => r.public_id),
      isAvailable: isAvailable === 'true' || isAvailable === true
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

  const { title, price, capacity, features, pricePerNight, isAvailable, imagesToDelete, description, fullDescription } = req.body;

  room.title = title || room.title;
  room.price = price || room.price;
  room.pricePerNight = pricePerNight !== undefined ? pricePerNight : room.pricePerNight;
  room.capacity = capacity || room.capacity;
  room.isAvailable = (isAvailable !== undefined) ? (isAvailable === 'true' || isAvailable === true) : room.isAvailable;
  if (description !== undefined) {
    room.description = description;
  }
  if (fullDescription !== undefined) {
    room.fullDescription = fullDescription;
  }

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

  // --- ПЕРЕРАБОТАННАЯ Логика Обработки Изображений --- 

  // 1. Обработка удаления
  let imagesToDeleteParsed = [];
  if (imagesToDelete && typeof imagesToDelete === 'string') {
      try {
          imagesToDeleteParsed = JSON.parse(imagesToDelete);
          if (!Array.isArray(imagesToDeleteParsed)) imagesToDeleteParsed = [];
      } catch (e) { 
          console.error('[updateRoom] Ошибка парсинга imagesToDelete:', e); 
          imagesToDeleteParsed = []; 
      }
  }

  const cloudinaryIdsToDelete = [];
  const urlsToRemoveFromDB = [];

  if (imagesToDeleteParsed.length > 0) {
      console.log('[updateRoom] Обработка удаляемых изображений:', imagesToDeleteParsed);
      imagesToDeleteParsed.forEach(imgData => {
          if (imgData && imgData.url) {
              urlsToRemoveFromDB.push(imgData.url);
              let publicId = imgData.publicId;
              if (!publicId) { // Пытаемся извлечь, если не пришел
                  publicId = extractPublicIdFromUrl(imgData.url);
                  if (publicId) {
                      console.log(`[updateRoom] Извлечен publicId '${publicId}' из URL '${imgData.url}'`);
                  } else {
                      console.warn(`[updateRoom] Не удалось извлечь publicId из URL для удаления: ${imgData.url}`);
                  }
              }
              if (publicId) {
                  cloudinaryIdsToDelete.push(publicId);
              }
          }
      });

      if (cloudinaryIdsToDelete.length > 0) {
          console.log('[updateRoom] Попытка удаления из Cloudinary:', cloudinaryIdsToDelete);
          try {
              const deletionResults = await Promise.all(cloudinaryIdsToDelete.map(id => cloudinary.uploader.destroy(id)));
              console.log('[updateRoom] Результат удаления из Cloudinary:', deletionResults);
              // Проверяем результат удаления (может быть { result: 'ok' } или { result: 'not found' })
              const successfullyDeletedIds = cloudinaryIdsToDelete.filter((_, index) => 
                  deletionResults[index] && (deletionResults[index].result === 'ok' || deletionResults[index].result === 'not found')
              );
              console.log('[updateRoom] Успешно удаленные или не найденные в Cloudinary ID:', successfullyDeletedIds);
              // Фильтруем URL для удаления из БД только для тех, что успешно удалены/не найдены в Cloudinary
              const finalUrlsToRemoveFromDB = urlsToRemoveFromDB.filter(url => {
                 let urlPublicId = extractPublicIdFromUrl(url);
                 return successfullyDeletedIds.includes(urlPublicId);
              });
              
              // Обновляем массивы в объекте room
              room.imageUrls = room.imageUrls.filter(url => !finalUrlsToRemoveFromDB.includes(url));
              room.cloudinaryPublicIds = room.cloudinaryPublicIds.filter(id => !successfullyDeletedIds.includes(id));
              console.log('[updateRoom] Массивы imageUrls и cloudinaryPublicIds обновлены в объекте.');
          } catch (deleteError) {
              console.error('[updateRoom] Ошибка при удалении файлов из Cloudinary:', deleteError);
              // Можно решить, прерывать ли операцию или просто логировать
              // res.status(500); throw new Error('Ошибка при удалении старых изображений');
          }
      } else if (urlsToRemoveFromDB.length > 0) {
         // Если были URL для удаления, но не было ID (т.е. только из БД)
         room.imageUrls = room.imageUrls.filter(url => !urlsToRemoveFromDB.includes(url));
         console.log('[updateRoom] Удалены URL из объекта комнаты (без удаления из Cloudinary):', urlsToRemoveFromDB);
      }
  }

  // 2. Обработка добавления новых файлов
  if (req.files && req.files.length > 0) {
    console.log(`[updateRoom] Добавляются ${req.files.length} новых изображений.`);
    try {
      const imageUploadResults = await uploadMultipleToCloudinary(req.files);
      console.log('[updateRoom] Результат загрузки новых изображений:', imageUploadResults);
      room.imageUrls.push(...imageUploadResults.map(r => r.secure_url));
      room.cloudinaryPublicIds.push(...imageUploadResults.map(r => r.public_id));
      console.log('[updateRoom] Новые imageUrls и cloudinaryPublicIds добавлены в объект.');
    } catch (uploadError) {
      console.error('Cloudinary Upload Error (Update Room):', uploadError);
      res.status(500);
      throw new Error('Ошибка при загрузке новых изображений комнаты');
    }
  }

  // 3. Сохранение комнаты ОДИН раз
  try {
    const updatedRoom = await room.save();
    console.log('[updateRoom] Комната успешно сохранена.');
    res.json(updatedRoom);
  } catch (dbError) {
    console.error('Database Save Error (Update Room):', dbError);
    // Важно: Если была загрузка новых файлов и произошла ошибка БД,
    // нужно откатить загрузку (удалить новые файлы из Cloudinary).
    // Эта логика здесь не добавлена для простоты, но в проде нужна.
    if (dbError.name === 'VersionError') {
        res.status(409); // Conflict
        throw new Error('Конфликт версий. Данные были изменены другим пользователем. Попробуйте обновить страницу и повторить.');
    } else {
        res.status(500);
        throw new Error('Ошибка при сохранении обновлений комнаты');
    }
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

const MAX_RETRIES = 3; // Максимальное количество повторных попыток
const RETRY_DELAY_MS = 100; // Задержка перед повторной попыткой (в миллисекундах)

// @desc    Обновить порядок комнат
// @route   PUT /api/rooms/order
// @access  Private/Admin
const updateRoomsOrder = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body; 
  console.log('[updateRoomsOrder] Received orderedIds:', orderedIds);

  if (!Array.isArray(orderedIds)) {
    console.error('[updateRoomsOrder] Error: orderedIds is not an array');
    res.status(400);
    throw new Error('Ожидался массив orderedIds');
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    const session = await mongoose.startSession();
    session.startTransaction();
    console.log(`[updateRoomsOrder] Attempt ${retries + 1}/${MAX_RETRIES}. Transaction started.`);

    try {
      const updatePromises = orderedIds.map((id, index) => {
        console.log(`[updateRoomsOrder Attempt ${retries + 1}] Updating room ${id} with displayOrder ${index}`);
        return Room.findByIdAndUpdate(id, { displayOrder: index }, { session })
          .catch(err => {
               console.error(`[updateRoomsOrder Attempt ${retries + 1}] Error updating room ${id} within transaction:`, err);
               throw err; // Пробрасываем ошибку, чтобы Promise.all завершился неудачно
          });
      });
      
      const results = await Promise.all(updatePromises);
      console.log(`[updateRoomsOrder Attempt ${retries + 1}] Update promises finished.`, results.length, 'documents processed');

      await session.commitTransaction();
      console.log(`[updateRoomsOrder Attempt ${retries + 1}] Transaction committed successfully.`);
      session.endSession();

      res.json({ message: 'Порядок комнат успешно обновлен' });
      return; // Выходим из функции при успехе

    } catch (error) {
      console.error(`[updateRoomsOrder Attempt ${retries + 1}] Error during transaction:`, error);
      // Важно: проверяем, можно ли безопасно откатить транзакцию
      if (session.inTransaction()) {
         await session.abortTransaction();
         console.log(`[updateRoomsOrder Attempt ${retries + 1}] Transaction aborted.`);
      } else {
         console.log(`[updateRoomsOrder Attempt ${retries + 1}] Session not in transaction, cannot abort.`);
      }
      session.endSession();

      // Проверяем, является ли ошибка временной ошибкой транзакции
      if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError') && retries < MAX_RETRIES - 1) {
        retries++;
        console.log(`[updateRoomsOrder] TransientTransactionError detected. Retrying attempt ${retries + 1}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Ждем перед следующей попыткой
        continue; // Переходим к следующей итерации цикла while
      } else {
        // Если это не временная ошибка или попытки исчерпаны, пробрасываем ошибку дальше
        console.error('[updateRoomsOrder] Non-retryable error or max retries reached.');
        res.status(500);
        throw new Error('Не удалось обновить порядок комнат после нескольких попыток');
      }
    }
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