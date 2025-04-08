const Room = require('../models/Room');
const User = require('../models/User');
const Service = require('../models/Service');
const HomepageContent = require('../models/HomepageContent');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Данные для сидинга комнат - используем imageUrls
const rooms = [
  {
    // id: '2-economy', // id больше не нужен, MongoDB генерирует _id
    title: '2-местный эконом',
    imageUrls: ['https://i.ibb.co/G2jVnrr/room-economy.jpg'], // Обернули в массив
    cloudinaryPublicIds: [], // Добавляем пустой массив
    price: '2 500 ₽ / сутки (1 чел)',
    priceValue: 2500,
    capacity: 2,
    features: ['2 отдельные кровати', 'Телевизор', 'Общий душ', 'Балкон'],
    isAvailable: true
  },
  {
    title: '2-местный семейный',
    imageUrls: ['https://i.ibb.co/SNhQVsp/room-family.jpg'], // Обернули в массив
    cloudinaryPublicIds: [],
    price: '3 800 ₽ / сутки',
    priceValue: 3800,
    capacity: 2,
    features: ['Двуспальная кровать', 'Холодильник', 'Душевая кабина', 'Санузел'],
    isAvailable: true
  },
  {
    title: '4-местный эконом',
    imageUrls: ['https://i.ibb.co/cDrmHSK/room-multiple.jpg'], // Обернули в массив
    cloudinaryPublicIds: [],
    price: '5 000 ₽ / сутки',
    priceValue: 5000,
    capacity: 4,
    features: ['4 односпальных кровати', '2 комнаты', 'Душевая кабина', 'Ванна'],
    isAvailable: true
  }
];

// Добавляем массив с начальными данными для услуг
const services = [
  {
    name: "Бесплатный Wi-Fi",
    description: "Высокоскоростной доступ в Интернет на всей территории отеля.",
    icon: "fas fa-wifi", // Пример иконки FontAwesome
  },
  {
    name: "Завтрак (шведский стол)",
    description: "Разнообразный завтрак с горячими и холодными блюдами.",
    icon: "fas fa-utensils",
    price: 500, 
  },
  {
    name: "Парковка",
    description: "Охраняемая парковка для гостей отеля.",
    icon: "fas fa-parking",
  },
  {
    name: "Трансфер",
    description: "Организация трансфера от/до аэропорта или вокзала.",
    icon: "fas fa-shuttle-van",
  }
];

// Данные для контактов
const contactData = {
  title: "Контактная информация",
  address: "Московская область, г. Жуковский, ул. Нижегородская, д. 4",
  phone: ["8 (498) 483 19 41", "8 (915) 120 17 44"],
  email: "info@lesnoy-dvorik.example.com" // Замените на реальный email!
};

/**
 * Создает администратора, если его еще нет
 */
const seedAdminUser = async () => {
  try {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    // Проверяем, заданы ли переменные окружения
    if (!username || !password) {
      console.warn('\n*** ВНИМАНИЕ: Для создания администратора необходимо задать переменные ADMIN_USERNAME и ADMIN_PASSWORD в файле .env! ***\n');
      return; // Не создаем админа, если нет данных
    }
    
    const adminExists = await User.findOne({ username: username });

    if (!adminExists) {
      // Убираем предупреждение о небезопасном пароле, так как его больше нет по умолчанию
      /*
      if (password === 'password') {
        console.warn('\n*** ВНИМАНИЕ: Используется небезопасный пароль администратора по умолчанию! Установите ADMIN_PASSWORD в .env! ***\n');
      }
      */

      await User.create({
        username: username,
        password: password, // Пароль будет хеширован моделью User
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
 * Заполняет базу данных начальными данными (комнаты, админ, услуги)
 */
const seedDatabase = async () => {
  try {
    // Админ
    await seedAdminUser();

    // Комнаты
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany(rooms);
      console.log('Начальные данные о комнатах добавлены в базу данных');
    } else {
      // console.log('Данные о комнатах уже существуют.');
    }

    // Услуги
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.insertMany(services);
      console.log('Начальные данные об услугах добавлены в базу данных');
    } else {
      // console.log('Данные об услугах уже существуют.');
    }

    // Контент главной страницы (добавляем/обновляем контакты)
    let homepageDoc = await HomepageContent.findOne({ identifier: 'main' });
    if (!homepageDoc) {
      // Если документа нет, создаем его с контактными данными
      homepageDoc = await HomepageContent.create({ 
        identifier: 'main',
        contact: contactData 
        // Можно добавить и другие поля по умолчанию, если нужно
      });
      console.log('Документ HomepageContent создан с контактными данными.');
    } else {
      // Если документ есть, обновляем только контактные данные
      homepageDoc.contact = contactData;
      // Опционально: можно добавить обновление других полей, если они изменились
      // homepageDoc.heroTitle = "Новый заголовок"; 
      await homepageDoc.save();
      console.log('Контактные данные в HomepageContent обновлены.');
    }

  } catch (error) {
    console.error(`Ошибка при заполнении базы данных: ${error.message}`);
  }
};

module.exports = seedDatabase; 