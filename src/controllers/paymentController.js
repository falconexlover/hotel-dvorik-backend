const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const yooKassa = require('../config/yookassaConfig');
const sendEmail = require('../utils/sendEmail');

// @desc    Обработка уведомлений (webhook) от ЮKassa
// @route   POST /api/payments/yookassa/webhook
// @access  Public (но проверяется внутри)
const handleYookassaWebhook = asyncHandler(async (req, res) => {
  console.log('Получено уведомление от ЮKassa:', req.body);

  const notification = req.body;

  // Проверка типа уведомления и объекта
  if (!notification || !notification.type || !notification.object || notification.type !== 'notification') {
    console.error('Некорректное уведомление от ЮKassa: отсутствует type или object');
    return res.status(400).send('Bad Request: Invalid notification format');
  }

  const payment = notification.object;

  // Проверка наличия ID платежа и статуса
  if (!payment || !payment.id || !payment.status) {
    console.error('Некорректный объект платежа в уведомлении ЮKassa');
    return res.status(400).send('Bad Request: Invalid payment object');
  }

  // Проверка подлинности уведомления (ВАЖНО! Раскомментировать при наличии реального IP ЮKassa)
  /*
  const sourceIp = req.ip || req.connection.remoteAddress;
  const allowedIps = [
    '185.71.76.0/27',
    '185.71.77.0/27',
    '77.75.153.0/25',
    '77.75.156.11',
    '77.75.156.35',
    '77.75.154.128/25',
    '2a02:5180:0:1509::/64',
    '2a02:5180:0:2655::/64',
    '2a02:5180:0:1533::/64',
    '2a02:5180:0:2667::/64'
  ]; // Актуальные IP см. в документации ЮKassa
  const ipaddr = require('ipaddr.js');
  let isAllowed = false;
  for (const range of allowedIps) {
      if (ipaddr.process(sourceIp).match(ipaddr.parseCIDR(range))) {
          isAllowed = true;
          break;
      }
  }
  if (!isAllowed) {
      console.warn(`Webhook от ЮKassa получен с неразрешенного IP: ${sourceIp}`);
      return res.status(403).send('Forbidden: IP not allowed');
  }
  */

  // Найти бронирование по paymentId
  const booking = await Booking.findOne({ paymentId: payment.id });

  if (!booking) {
    console.warn(`Не найдено бронирование для paymentId: ${payment.id}`);
    // Важно вернуть 200 OK, чтобы ЮKassa не повторяла попытки
    return res.status(200).send('OK: Booking not found');
  }

  // Обработка статусов платежа
  switch (payment.status) {
    case 'succeeded':
      if (booking.status !== 'paid') { // Обновляем, только если еще не оплачено
        booking.status = 'paid';
        booking.paidAt = new Date();
        await booking.save();
        console.log(`Бронирование ${booking.bookingNumber} успешно оплачено.`);

        // Отправка email подтверждения об успешной оплате
        try {
          const room = await Room.findById(booking.roomId);
          await sendEmail({
            to: booking.guestEmail,
            subject: 'Оплата бронирования успешно завершена',
            html: `
              <h2>Оплата получена!</h2>
              <p>Уважаемый(ая) ${booking.guestName},</p>
              <p>Ваше бронирование номера "${room ? room.title : 'Выбранный номер'}" успешно оплачено.</p>
              <p>Номер бронирования: <strong>${booking.bookingNumber}</strong></p>
              <p>Даты проживания: с ${new Date(booking.checkIn).toLocaleDateString()} по ${new Date(booking.checkOut).toLocaleDateString()}</p>
              <p>Оплаченная сумма: ${booking.totalPrice} ₽</p>
              <p>Ждем вас в отеле "Лесной дворик"!</p>
              <p>С уважением,<br>Команда "Лесной дворик"</p>
            `
          });
        } catch (emailError) {
          console.error(`Ошибка отправки email для бронирования ${booking.bookingNumber}:`, emailError);
          // Не прерываем процесс, просто логируем ошибку
        }
      } else {
        console.log(`Повторное уведомление об оплате для бронирования ${booking.bookingNumber}. Игнорируется.`);
      }
      break;
    case 'canceled':
      if (booking.status === 'waiting_for_payment') { // Отменяем, только если ожидалась оплата
        booking.status = 'cancelled';
        await booking.save();
        console.log(`Платеж для бронирования ${booking.bookingNumber} отменен.`);
        // Можно отправить email об отмене платежа/бронирования
      } else {
          console.log(`Уведомление об отмене для бронирования ${booking.bookingNumber} в статусе ${booking.status}. Игнорируется.`);
      }
      break;
    case 'waiting_for_capture':
      // Если capture: false, нужно будет подтверждать платеж здесь
      console.log(`Платеж для бронирования ${booking.bookingNumber} ожидает подтверждения.`);
      break;
    case 'pending':
      // Платеж еще не завершен
      console.log(`Платеж для бронирования ${booking.bookingNumber} еще в обработке.`);
      break;
    default:
      console.log(`Неизвестный статус платежа ${payment.status} для бронирования ${booking.bookingNumber}`);
  }

  // Отправляем 200 OK, чтобы ЮKassa поняла, что уведомление получено
  res.status(200).send('OK');
});

module.exports = {
  handleYookassaWebhook,
}; 