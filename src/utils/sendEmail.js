const nodemailer = require('nodemailer');

/**
 * Отправляет электронное письмо
 * @param {Object} options - Параметры письма
 * @param {string} options.to - Email получателя
 * @param {string} options.subject - Тема письма
 * @param {string} options.html - HTML-содержимое письма
 */
const sendEmail = async (options) => {
  // Создаем transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true для порта 465, false для других портов
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Опции письма
  const mailOptions = {
    from: `Отель "Лесной дворик" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  // Отправляем письмо
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail; 