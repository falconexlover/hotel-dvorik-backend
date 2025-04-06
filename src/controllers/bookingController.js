const Booking = require('../models/Booking');
const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');
const generateBookingNumber = require('../utils/generateBookingNumber');
const sendEmail = require('../utils/sendEmail');

// @desc    Создать новое бронирование
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    checkIn,
    checkOut,
    adults,
    children,
    roomId,
    totalCost,
    notes
  } = req.body;

  // Проверка, существует ли комната
  const room = await Room.findOne({ id: roomId });
  if (!room) {
    res.status(400);
    throw new Error('Указанная комната не найдена');
  }

  // Генерация уникального номера бронирования
  const bookingNumber = generateBookingNumber();

  const booking = await Booking.create({
    firstName,
    lastName,
    email,
    phone,
    checkIn,
    checkOut,
    adults,
    children,
    roomId,
    totalCost,
    notes,
    bookingNumber,
    status: 'pending'
  });

  if (booking) {
    // Отправка подтверждения на email
    await sendEmail({
      to: email,
      subject: 'Подтверждение бронирования',
      html: `
        <h2>Бронирование успешно создано!</h2>
        <p>Уважаемый(ая) ${firstName} ${lastName},</p>
        <p>Ваше бронирование номера "${room.title}" было успешно создано.</p>
        <p>Номер бронирования: <strong>${bookingNumber}</strong></p>
        <p>Даты проживания: с ${new Date(checkIn).toLocaleDateString()} по ${new Date(checkOut).toLocaleDateString()}</p>
        <p>Общая стоимость: ${totalCost} ₽</p>
        <p>Наш менеджер свяжется с вами в ближайшее время для подтверждения деталей.</p>
        <p>С уважением,<br>Команда "Лесной дворик"</p>
      `
    });

    res.status(201).json({
      ...booking._doc,
      roomTitle: room.title
    });
  } else {
    res.status(400);
    throw new Error('Некорректные данные бронирования');
  }
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
  deleteBooking
}; 