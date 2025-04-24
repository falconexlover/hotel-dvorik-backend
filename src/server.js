const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const homepageRoutes = require('./routes/homepageRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const pageRoutes = require('./routes/pageRoutes');
const articleRoutes = require('./routes/articleRoutes');
const seedDatabase = require('./utils/seedData');

// Загрузка переменных окружения
dotenv.config();

// Подключение к базе данных
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Маршруты API
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/payments', paymentRoutes);
// console.log("[server.js] Регистрация /api/pages с объектом типа:", typeof pageRoutes, pageRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/articles', articleRoutes);

// Проверка API
app.get('/', (req, res) => {
  res.send('API отеля "Лесной дворик" работает');
});

// Middleware для обработки ошибок
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Сервер запущен в ${process.env.NODE_ENV} режиме на порту ${PORT}`);
  
  // Если включен режим разработки, заполняем базу данных начальными данными
  if (process.env.NODE_ENV === 'development') {
    seedDatabase();
  }
}); 