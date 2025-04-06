# Бэкенд для отеля "Лесной дворик"

API-сервер для фронтенд-приложения отеля "Лесной дворик".

## Технологии

- Node.js
- Express.js
- MongoDB
- JWT
- Nodemailer

## Установка

1. Клонировать репозиторий:
```
git clone <репозиторий>
cd <папка_проекта>/BACK
```

2. Установить зависимости:
```
npm install
```

3. Создать файл .env в корне проекта и заполнить его необходимыми переменными окружения:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/hotel-forest?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Запуск

Для разработки:
```
npm run dev
```

Для продакшена:
```
npm start
```

## API Endpoints

### Комнаты
- `GET /api/rooms` - получить все комнаты
- `GET /api/rooms/:id` - получить комнату по ID
- `POST /api/rooms/check-availability` - проверить доступность комнаты

### Бронирования
- `POST /api/bookings` - создать новое бронирование
- `GET /api/bookings/:number` - получить бронирование по номеру

## Деплой на бесплатный хостинг

### Render.com
1. Зарегистрироваться на [Render](https://render.com/)
2. Создать новый Web Service
3. Связать с репозиторием GitHub
4. Настроить сборку:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Добавить переменные окружения в разделе Environment
6. Создать базу данных MongoDB Atlas и подключить её

### Railway.app
1. Зарегистрироваться на [Railway](https://railway.app/)
2. Создать новый проект
3. Выбрать деплой из GitHub
4. Настроить переменные окружения
5. Добавить MongoDB в проект или использовать внешнюю MongoDB Atlas

### Fly.io
1. Зарегистрироваться на [Fly.io](https://fly.io/)
2. Установить Flyctl CLI
3. Авторизоваться: `flyctl auth login`
4. Создать файл `fly.toml` в корне проекта
5. Запустить: `flyctl deploy`
6. Добавить переменные окружения

## Примечания по интеграции с фронтендом

Чтобы интегрировать бэкенд с фронтендом на Vercel, необходимо:

1. Обновить API endpoint в фронтенд-приложении, указав адрес вашего развернутого бэкенда
2. Настроить CORS на бэкенде для домена фронтенда
3. Настроить переменные окружения на фронтенде для указания URL API 