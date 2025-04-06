const Room = require('../models/Room');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const rooms = [
  {
    id: '2-economy',
    title: '2-местный эконом',
    image: 'https://i.ibb.co/G2jVnrr/room-economy.jpg',
    price: '2 500 ₽ / сутки (1 чел)',
    priceValue: 2500,
    capacity: 2,
    features: ['2 отдельные кровати', 'Телевизор', 'Общий душ', 'Балкон'],
    isAvailable: true
  },
  {
    id: '2-family',
    title: '2-местный семейный',
    image: 'https://i.ibb.co/SNhQVsp/room-family.jpg',
    price: '3 800 ₽ / сутки',
    priceValue: 3800,
    capacity: 2,
    features: ['Двуспальная кровать', 'Холодильник', 'Душевая кабина', 'Санузел'],
    isAvailable: true
  },
  {
    id: '4-economy',
    title: '4-местный эконом',
    image: 'https://i.ibb.co/cDrmHSK/room-multiple.jpg',
    price: '5 000 ₽ / сутки',
    priceValue: 5000,
    capacity: 4,
    features: ['4 односпальных кровати', '2 комнаты', 'Душевая кабина', 'Ванна'],
    isAvailable: true
  }
];

/**
 * Создает администратора, если его еще нет
 */
const seedAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });

    if (!adminExists) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'password';

      if (password === 'password') {
        console.warn('\n*** ВНИМАНИЕ: Используется небезопасный пароль администратора по умолчанию! Установите ADMIN_PASSWORD в .env! ***\n');
      }

      await User.create({
        username: username,
        password: password,
      });
      console.log(`Администратор "${username}" создан.`);
    } else {
      // console.log('Администратор уже существует.');
    }
  } catch (error) {
    console.error(`Ошибка при создании администратора: ${error.message}`);
  }
};

/**
 * Заполняет базу данных начальными данными (комнаты и админ)
 */
const seedDatabase = async () => {
  try {
    // Админ
    await seedAdminUser();

    // Комнаты (опционально, возможно, не нужно удалять каждый раз)
    // await Room.deleteMany({});
    // console.log('Существующие данные о комнатах удалены');
    
    // Проверим, есть ли уже комнаты, чтобы не дублировать
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany(rooms);
      console.log('Начальные данные о комнатах добавлены в базу данных');
    } else {
      // console.log('Данные о комнатах уже существуют.');
    }

  } catch (error) {
    console.error(`Ошибка при заполнении базы данных: ${error.message}`);
    // Убираем process.exit(1), чтобы ошибка сидинга не останавливала сервер
    // process.exit(1);
  }
};

module.exports = seedDatabase; 