const Booking = require('../models/Booking');
const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid'); // Для idempotency key
const yooKassa = require('../config/yookassaConfig'); // Импорт настроенного SDK
const generateBookingNumber = require('../utils/generateBookingNumber');
const mongoose = require('mongoose');
// const sendEmail = require('../utils/sendEmail'); // Email отправляем после оплаты

// Вспомогательная функция для расчета ночей
const calculateNights = (checkInStr, checkOutStr) => {
    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return 0;
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// @desc    Создать новое бронирование и инициировать оплату
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  const {
    roomId,
    checkIn, // Ожидаем строку YYYY-MM-DD
    checkOut, // Ожидаем строку YYYY-MM-DD
    guests, // Ожидаем { adults: number, children: number }
    guestName,
    guestEmail,
    guestPhone,
    notes,
    // totalPrice и numberOfNights больше не принимаем из req.body
  } = req.body;

  // --- Логирование --- 
  console.log('--- Создание бронирования ---');
  console.log('Получен roomId:', roomId);
  console.log('Получены гости:', req.body.guests);
  console.log('Получены даты:', req.body.checkIn, '-', req.body.checkOut);
  // --- Конец логирования ---

  // --- Валидация входных данных --- 
  if (!roomId || !checkIn || !checkOut || !guests || typeof guests.adults !== 'number' || guests.adults < 1 || typeof guests.children !== 'number' || guests.children < 0 || !guestName || !guestEmail || !guestPhone) {
    res.status(400);
    throw new Error('Не все обязательные поля бронирования заполнены или имеют неверный формат.');
  }

  // Проверка валидности дат
  const numberOfNights = calculateNights(checkIn, checkOut);
  if (numberOfNights <= 0) {
      res.status(400);
      throw new Error('Некорректные даты заезда или выезда.');
  }

  // Проверка, существует ли комната и получение ее цены
  let room;
  try {
      room = await Room.findById(roomId);
      // --- Логирование --- 
      console.log('Найденная комната (room):\n', JSON.stringify(room, null, 2)); // Выводим найденную комнату
      // --- Конец логирования ---
  } catch (err) {
      console.error(`Ошибка при поиске комнаты с ID ${roomId}:`, err);
      res.status(500);
      throw new Error('Ошибка сервера при поиске комнаты.');
  }

  // ПРОВЕРКА: используем pricePerNight
  if (!room || typeof room.pricePerNight !== 'number' || room.pricePerNight <= 0) { 
    // --- Логирование --- 
    console.error('Ошибка проверки цены! room:', room);
    // --- Конец логирования ---
    res.status(400);
    throw new Error('Указанная комната не найдена или для нее не установлена корректная цена.');
  }
  
  // TODO: Добавить более сложную проверку доступности комнаты на выбранные даты
  // Например, проверить, не пересекается ли запрашиваемый период с существующими бронированиями для этой комнаты.

  // Расчет итоговой стоимости - НОВЫЙ ВАРИАНТ
  let calculatedTotalPrice = numberOfNights * room.pricePerNight;
  const ADULT_SURCHARGE_PER_NIGHT = 1400; // <--- Изменяем доплату на 1400

  if (guests.adults === 2) {
      calculatedTotalPrice += ADULT_SURCHARGE_PER_NIGHT * numberOfNights;
      console.log(`Добавлена доплата за второго взрослого: ${ADULT_SURCHARGE_PER_NIGHT * numberOfNights} RUB`);
  } else if (guests.adults > 2) {
      // Опционально: добавьте логику для 3+ взрослых, если нужно
      console.warn(`Расчет цены для ${guests.adults} взрослых пока не реализован.`);
  }

  const totalPrice = calculatedTotalPrice; // Используем новую переменную

  // --- Логирование --- 
  console.log(`Расчет: ${numberOfNights} ночей * ${room.pricePerNight} + доплаты = ${totalPrice} RUB`); // Новое логирование
  // --- Конец логирования ---

  // Генерация уникального номера бронирования
  const bookingNumber = generateBookingNumber();

  // Создаем бронирование со статусом ожидания оплаты
  let booking;
  try {
    booking = new Booking({
      roomId: room._id,
      checkIn,
      checkOut,
      numberOfNights, // Сохраняем рассчитанное кол-во ночей
      email: guestEmail,
      phone: guestPhone,
      notes: notes || '',
      totalCost: totalPrice, // Сохраняем рассчитанную стоимость
      // Разделяем имя, если это одна строка
      firstName: guestName.split(' ')[0] || guestName,
      lastName: guestName.split(' ').slice(1).join(' ') || ' ',
      adults: guests.adults,
      children: guests.children,
      bookingNumber,
      status: 'waiting_for_payment',
      paymentId: null,
      paidAt: null
    });
    await booking.save(); // Сохраняем в БД

  } catch (dbError) {
      console.error('Ошибка создания бронирования в БД:', dbError);
      res.status(500);
      throw new Error('Ошибка сервера при создании записи бронирования.');
  }

  // Создание платежа в ЮKassa
  let payment;
  try {
    const idempotenceKey = uuidv4();
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').trim(); 
    const frontendReturnUrl = `${frontendBaseUrl}/booking/status?bookingId=${booking._id}`;
    console.log('Сформированный return_url:', frontendReturnUrl); 

    // --- Формирование данных для чека --- 
    const receiptItems = [
      {
        description: `Проживание в номере "${room.title || 'Выбранный номер'}" (${numberOfNights} ночей)`, // Описание услуги
        quantity: '1.0', // Количество услуг
        amount: {
          value: totalPrice.toFixed(2), // Полная стоимость услуги
          currency: 'RUB'
        },
        vat_code: '6', // Код ставки НДС (!!! ВАЖНО: Уточните вашу ставку НДС !!! 6 = без НДС)
        payment_mode: 'full_payment', // Признак способа расчета (полная предоплата)
        payment_subject: 'service' // Признак предмета расчета (услуга)
      }
    ];

    const receiptCustomer = {};
    if (guestEmail) {
        receiptCustomer.email = guestEmail;
    } else if (guestPhone) {
        // ЮKassa требует телефон в формате ITU-T E.164 (+71234567890)
        const cleanedPhone = guestPhone.replace(/\D/g, ''); 
        // Простая проверка на российский номер, можно улучшить
        if (cleanedPhone.length === 11 && (cleanedPhone.startsWith('7') || cleanedPhone.startsWith('8'))) {
             receiptCustomer.phone = `+7${cleanedPhone.slice(1)}`;
        } else if (cleanedPhone.length === 10) {
             receiptCustomer.phone = `+7${cleanedPhone}`;
        } else {
            console.warn(`Не удалось форматировать телефон ${guestPhone} для чека. Укажите email.`);
            // Можно либо не отправлять телефон, либо передать как есть, но может быть ошибка
            // receiptCustomer.phone = guestPhone; 
        }
    } else {
        // Если нет ни email, ни телефона, ЮKassa выдаст ошибку. Нужно хотя бы что-то одно.
        throw new Error('Для формирования чека необходим email или телефон клиента.');
    }
    // --- Конец формирования данных для чека ---

    payment = await yooKassa.createPayment({
      amount: {
        value: totalPrice.toFixed(2),
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      confirmation: {
        type: 'redirect',
        return_url: frontendReturnUrl
      },
      capture: true,
      description: `Бронирование №${bookingNumber} (${room.title || 'отель "Лесной дворик"'})`,
      metadata: {
        bookingId: booking._id.toString()
      },
      // --- ДОБАВЛЯЕМ ЧЕК --- 
      receipt: {
          customer: receiptCustomer,
          items: receiptItems
      }
      // --- КОНЕЦ ДОБАВЛЕНИЯ ЧЕКА ---
    }, idempotenceKey);

    // Сохраняем ID платежа в бронировании
    booking.paymentId = payment.id;
    await booking.save();

  } catch (paymentError) {
    console.error('Ошибка создания платежа в ЮKassa:', paymentError);
    // Важно: Откатить создание бронирования или изменить статус на failed, чтобы не было "подвисших" записей
    // booking.status = 'payment_failed'; await booking.save(); или await Booking.findByIdAndDelete(booking._id);
    try {
        await Booking.findByIdAndDelete(booking._id);
        console.log(`Бронирование ${booking._id} удалено из-за ошибки платежа.`);
    } catch (deleteError) {
        console.error(`Критическая ошибка: не удалось удалить бронирование ${booking._id} после ошибки платежа.`, deleteError);
        // Возможно, стоит добавить логирование или оповещение администратора
    }
    // Добавляем детали ошибки ЮKassa в сообщение для фронтенда, если возможно
    let clientErrorMessage = 'Ошибка при создании платежа. Пожалуйста, повторите попытку.';
    if (paymentError && paymentError.code === 'invalid_request' && paymentError.parameter) {
        clientErrorMessage = `Ошибка данных для ЮKassa (параметр: ${paymentError.parameter}). Проверьте введенные данные.`;
    }
    res.status(500);
    throw new Error(clientErrorMessage);
  }

  // Отправляем URL для редиректа на оплату на фронтенд
  res.status(201).json({
    // bookingId: booking._id, // ID обычно не нужен фронту на этом этапе
    bookingNumber: booking.bookingNumber,
    status: booking.status, // 'waiting_for_payment'
    confirmationUrl: payment.confirmation.confirmation_url, // Ссылка на оплату
    // Дополнительные данные для возможного отображения на фронте до редиректа
    roomTitle: room.title,
    totalPrice: booking.totalCost, // Отправляем итоговую цену
    numberOfNights: booking.numberOfNights // Отправляем кол-во ночей
  });

});

// @desc    Получить бронирование по номеру
// @route   GET /api/bookings/:number
// @access  Public
const getBookingByNumber = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ bookingNumber: req.params.number });
  
  if (booking) {
    const room = await Room.findById(booking.roomId); // Исправлено: ищем по ID
    
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
  const bookings = await Booking.find({}).sort({ createdAt: -1 }); 
  res.json(bookings);
});

// @desc    Получить бронирование по ID
// @route   GET /api/bookings/id/:id
// @access  Public 
const getBookingById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Некорректный ID бронирования');
  }
  
  const booking = await Booking.findById(req.params.id);

  if (booking) {
    const room = await Room.findById(booking.roomId);

    res.json({
      ...booking._doc,
      roomTitle: room ? room.title : 'Неизвестный номер'
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

  // TODO: Возможно, перед удалением стоит проверить статус платежа и выполнить возврат, если применимо.
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