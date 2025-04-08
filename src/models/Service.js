const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Пожалуйста, укажите название услуги'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Поле для URL иконки или её идентификатора (например, FontAwesome класс)
    icon: {
      type: String, 
      trim: true,
    },
    // Поле для изображения услуги (опционально)
    imageUrl: {
      type: String,
      trim: true,
    },
    // Цена услуги (опционально)
    price: {
        type: Number,
        min: [0, 'Цена не может быть отрицательной'],
    },
    // Можно добавить другие поля, например, категорию
    // category: {
    //   type: String,
    //   enum: ['Основные', 'Дополнительные', 'Питание'], // Пример категорий
    // }
  },
  {
    timestamps: true, // Добавляет поля createdAt и updatedAt
  }
);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 