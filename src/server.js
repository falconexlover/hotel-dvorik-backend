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
const seedDatabase = require('./utils/seedData');

// Загрузка переменных окружения
dotenv.config();

// Подключение к базе данных
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Маршруты API
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/homepage', homepageRoutes);

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
  // if (process.env.NODE_ENV === 'development') {
  //   seedDatabase();
  // }
}); 