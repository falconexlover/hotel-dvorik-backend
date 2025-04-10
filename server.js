const bookingRoutes = require('./src/routes/bookingRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const promotionRoutes = require('./src/routes/promotionRoutes');
const pageRoutes = require('./src/routes/pageRoutes');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const connectDB = require('./src/config/db');

// ... (dotenv, connectDB, app = express()) ...

// Middleware для парсинга JSON
// ...

// Маршруты
app.use('/api/rooms', roomRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/promotions', promotionRoutes);

// Добавляем лог перед подключением маршрутов страниц
console.log('>>> Регистрируем маршруты /api/pages...'); 
app.use('/api/pages', pageRoutes); 
console.log('>>> Маршруты /api/pages зарегистрированы.');

// ... (обработка 404, errorHandler) ...

// Запуск сервера
// ... 