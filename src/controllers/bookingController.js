const Booking = require('../models/Booking');
const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid'); // Для idempotency key
const yooKassa = require('../config/yookassaConfig'); // Импорт настроенного SDK
const generateBookingNumber = require('../utils/generateBookingNumber');
const mongoose = require('mongoose');
// const sendEmail = require('../utils/sendEmail'); // Email отправляем после оплаты

// @desc    Создать новое бронирование и инициировать оплату
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  const {
    roomId,
    checkIn,
    checkOut,
    guests, // Предполагаем, что это объект { adults, children }
    guestName, // Заменили firstName, lastName
    guestEmail,
    guestPhone,
    notes,
    totalPrice, // Переименовали totalCost
    numberOfNights // Добавили
  } = req.body;

  // --- Валидация входных данных (основная) ---
  if (!roomId || !checkIn || !checkOut || !guests || !guestName || !guestEmail || !guestPhone || !totalPrice || totalPrice <= 0) {
    res.status(400);
    throw new Error('Не все обязательные поля бронирования заполнены.');
  }

  // Проверка, существует ли комната и доступна ли она (упрощенная проверка)
  const room = await Room.findById(roomId); // Ищем по _id
  if (!room) {
    res.status(400);
    throw new Error('Указанная комната не найдена.');
  }
  // TODO: Добавить проверку доступности комнаты на выбранные даты (isAvailable или проверка пересечений)

  // Генерация уникального номера бронирования
  const bookingNumber = generateBookingNumber();

  // Создаем бронирование со статусом ожидания оплаты
  let booking;
  try {
    booking = await Booking.create({
      roomId: room._id,
      checkIn,
      checkOut,
      email: guestEmail,
      phone: guestPhone,
      notes,
      totalCost: totalPrice,
      firstName: guestName ? (guestName.split(' ')[0] || guestName) : '',
      lastName: guestName ? (guestName.split(' ').slice(1).join(' ') || ' ') : '',
      adults: (guests && typeof guests.adults === 'number') ? guests.adults : 1,
      children: (guests && typeof guests.children === 'number') ? guests.children : 0,
      bookingNumber,
      status: 'waiting_for_payment',
      paymentId: null,
      paidAt: null
    });
  } catch (dbError) {
      console.error('Ошибка создания бронирования в БД:', dbError);
      res.status(500);
      throw new Error('Ошибка сервера при создании записи бронирования.');
  }

  // Создание платежа в ЮKassa
  let payment;
  try {
    const idempotenceKey = uuidv4(); // Уникальный ключ для каждого запроса создания платежа
    const frontendReturnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/status?bookingId=${booking._id}`;

    payment = await yooKassa.createPayment({
      amount: {
        value: totalPrice.toFixed(2), // Сумма с двумя знаками после запятой
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card' // Можно расширить методы оплаты позже
      },
      confirmation: {
        type: 'redirect',
        return_url: frontendReturnUrl
      },
      capture: true, // Автоматически захватывать платеж после оплаты
      description: `Оплата бронирования №${bookingNumber} в отеле "Лесной дворик"`, // Описание для пользователя
      metadata: {
        bookingId: booking._id.toString() // Передаем ID брони для вебхука
      }
    }, idempotenceKey);

    // Сохраняем ID платежа в бронировании
    booking.paymentId = payment.id;
    await booking.save();

  } catch (paymentError) {
    console.error('Ошибка создания платежа в ЮKassa:', paymentError);
    // TODO: Возможно, стоит откатить создание брони или пометить ее как 'failed_creation'
    res.status(500);
    throw new Error('Ошибка при инициации платежа. Попробуйте еще раз.');
  }

  // Отправляем URL для редиректа на оплату на фронтенд
  res.status(201).json({
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    confirmationUrl: payment.confirmation.confirmation_url,
    // Можно добавить еще нужные данные для фронтенда
    roomTitle: room.title,
    totalPrice: booking.totalCost
  });

  // Email отправляем ПОСЛЕ успешной оплаты (через webhook)
  /*
  await sendEmail({...});
  */
});

// @desc    Получить бронирование по номеру
// @route   GET /api/bookings/:number
// @access  Public
const getBookingByNumber = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ bookingNumber: req.params.number });
  
  if (booking) {
    const room = await Room.findOne({ id: booking.roomId });
    
    res.json({
      ...booking._doc,
      roomTitle: room ? room.title : 'Неизвестный номер'
    });
  } else {
    res.status(404);
    throw new Error('Бронирование не найдено');
  }
});

// @desc    Получить все бронирования
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = asyncHandler(async (req, res) => {
  // TODO: Добавить пагинацию
  const bookings = await Booking.find({}).sort({ createdAt: -1 }); // Сортировка по новым
  res.json(bookings);
});

// @desc    Получить бронирование по ID
// @route   GET /api/bookings/id/:id
// @access  Public (предположительно, т.к. используется на странице статуса)
const getBookingById = asyncHandler(async (req, res) => {
  // Проверка валидности ObjectID
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Некорректный ID бронирования');
  }
  
  const booking = await Booking.findById(req.params.id);

  if (booking) {
    // Опционально: получаем детали комнаты для отображения
    const room = await Room.findById(booking.roomId);

    res.json({
      ...booking._doc, // Возвращаем все данные бронирования
      roomTitle: room ? room.title : 'Неизвестный номер' // Добавляем название комнаты
    });
  } else {
    res.status(404);
    throw new Error('Бронирование не найдено');
  }
});

// @desc    Удалить бронирование
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Бронирование не найдено');
  }

  await booking.remove();

  res.json({ message: 'Бронирование успешно удалено' });
});

module.exports = {
  createBooking,
  getBookingByNumber,
  getAllBookings,
  deleteBooking,
  getBookingById,
}; 