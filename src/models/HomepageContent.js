const mongoose = require('mongoose');

// Схема для отдельного блока контента (если нужно)
// const contentBlockSchema = mongoose.Schema({
//   title: String,
//   text: String,
//   imageUrl: String,
// });

const homepageContentSchema = mongoose.Schema(
  {
    // Идентификатор для поиска единственного документа
    identifier: {
      type: String,
      default: 'main',
      unique: true,
    },
    // Пример полей для главной страницы
    heroTitle: {
      type: String,
      default: 'Добро пожаловать в Лесной Дворик!',
    },
    heroSubtitle: {
      type: String,
      default: 'Ваш уютный отдых на природе',
    },
    aboutText: {
      type: String,
      default: 'Подробное описание отеля...',
    },
    // Можно добавить массивы объектов для повторяющихся блоков
    // features: [contentBlockSchema],
  },
  {
    timestamps: true, // Добавляем временные метки
  }
);

// Метод для получения или создания контента главной страницы
homepageContentSchema.statics.getSingleton = async function () {
  let content = await this.findOne({ identifier: 'main' });
  if (!content) {
    content = await this.create({ identifier: 'main' });
  }
  return content;
};

const HomepageContent = mongoose.model('HomepageContent', homepageContentSchema);

module.exports = HomepageContent; 