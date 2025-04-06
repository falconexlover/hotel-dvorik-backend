const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

// @desc    Получить все комнаты
// @route   GET /api/rooms
// @access  Public
const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({});
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

// Вспомогательная функция для загрузки в Cloudinary
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

// @desc    Создать новую комнату
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = asyncHandler(async (req, res) => {
  const { title, price, capacity, features, priceValue } = req.body;
  // TODO: Валидация входных данных

  let imageUploadResult = null;
  if (req.file) {
    try {
      imageUploadResult = await uploadToCloudinary(req.file.buffer);
    } catch (uploadError) {
      console.error('Cloudinary Upload Error (Create Room):', uploadError);
      res.status(500);
      throw new Error('Ошибка при загрузке изображения комнаты');
    }
  }

  try {
    const newRoom = await Room.create({
      title,
      price,
      priceValue: priceValue || 0,
      capacity: capacity || 1,
      features: features ? (Array.isArray(features) ? features : [features]) : [],
      imageUrl: imageUploadResult ? imageUploadResult.secure_url : undefined,
      cloudinaryPublicId: imageUploadResult ? imageUploadResult.public_id : undefined,
      // Уникальный id можно генерировать или использовать _id
      id: new mongoose.Types.ObjectId().toString() // Пример генерации
    });
    res.status(201).json(newRoom);
  } catch (dbError) {
    console.error('Database Save Error (Create Room):', dbError);
    // Если ошибка БД, а файл загрузился, удаляем его из Cloudinary
    if (imageUploadResult && imageUploadResult.public_id) {
      await cloudinary.uploader.destroy(imageUploadResult.public_id);
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

  const { title, price, capacity, features, priceValue } = req.body;
  // TODO: Валидация

  room.title = title || room.title;
  room.price = price || room.price;
  room.priceValue = priceValue !== undefined ? priceValue : room.priceValue;
  room.capacity = capacity || room.capacity;
  room.features = features ? (Array.isArray(features) ? features : [features]) : room.features;

  // Обработка нового изображения
  if (req.file) {
    try {
      // Удаляем старое изображение из Cloudinary, если оно было
      if (room.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(room.cloudinaryPublicId);
      }

      // Загружаем новое
      const imageUploadResult = await uploadToCloudinary(req.file.buffer);
      room.imageUrl = imageUploadResult.secure_url;
      room.cloudinaryPublicId = imageUploadResult.public_id;

    } catch (uploadError) {
      console.error('Cloudinary Upload/Delete Error (Update Room):', uploadError);
      // Не прерываем обновление данных, но логируем ошибку
    }
  }

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
  const room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error('Комната не найдена');
  }

  // Удаление изображения из Cloudinary
  if (room.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(room.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary Delete Error (Delete Room):', cloudinaryError);
    }
  }

  // Удаление комнаты из БД
  await room.remove();

  res.json({ message: 'Комната успешно удалена' });
});

module.exports = {
  getRooms,
  getRoomById,
  checkRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom
}; 