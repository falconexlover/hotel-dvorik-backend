const asyncHandler = require('../middleware/express-async-handler');
const Service = require('../models/Service');

// @desc    Получить все услуги
// @route   GET /api/services
// @access  Public
const getAllServices = asyncHandler(async (req, res) => {
  const services = await Service.find({}); // Находим все документы в коллекции Service
  res.json(services); // Отправляем результат в виде JSON
});

// @desc    Создать услугу
// @route   POST /api/services
// @access  Private/Admin (защищено middleware protect)
const createService = asyncHandler(async (req, res) => {
  // Получаем данные из тела запроса
  const { name, description, icon, price } = req.body;

  // Валидация (минимальная)
  if (!name) {
    res.status(400);
    throw new Error('Название услуги обязательно');
  }

  // Создаем новую услугу
  const service = new Service({
    name,
    description: description || '', // Описание опционально
    icon: icon || 'fas fa-concierge-bell', // Иконка по умолчанию, если не указана
    price: price || 0, // Цена опциональна, по умолчанию 0
  });

  // Сохраняем в БД
  const createdService = await service.save();
  res.status(201).json(createdService); // Отправляем созданную услугу и статус 201
});

// @desc    Обновить услугу
// @route   PUT /api/services/:id
// @access  Private/Admin (защищено middleware protect)
const updateService = asyncHandler(async (req, res) => {
  const { name, description, icon, price } = req.body;
  const serviceId = req.params.id;

  const service = await Service.findById(serviceId);

  if (service) {
    // Обновляем поля, если они переданы в запросе
    service.name = name || service.name;
    service.description = description !== undefined ? description : service.description;
    service.icon = icon || service.icon;
    service.price = price !== undefined ? price : service.price;

    const updatedService = await service.save();
    res.json(updatedService);
  } else {
    res.status(404);
    throw new Error('Услуга не найдена');
  }
});

// @desc    Удалить услугу
// @route   DELETE /api/services/:id
// @access  Private/Admin (защищено middleware protect)
const deleteService = asyncHandler(async (req, res) => {
  const serviceId = req.params.id;
  const service = await Service.findById(serviceId);

  if (service) {
    await service.remove(); // Используем remove() для срабатывания middleware Mongoose (если есть)
    res.json({ message: 'Услуга успешно удалена' });
  } else {
    res.status(404);
    throw new Error('Услуга не найдена');
  }
});

// Экспортируем все функции контроллера
module.exports = {
  getAllServices,
  createService,
  updateService,
  deleteService
}; 