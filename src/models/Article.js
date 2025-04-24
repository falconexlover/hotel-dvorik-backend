const mongoose = require('mongoose');

// Простая функция для создания slug (теперь только цифры)
const generateSlug = (title) => {
  // Генерируем случайную строку из 8 цифр
  return Math.random().toString().slice(2, 10);
};

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Пожалуйста, укажите заголовок статьи'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Пожалуйста, добавьте текст статьи'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      trim: true,
      default: '',
    },
    author: {
      type: String, // Пока строка, можно изменить на ObjectId, если будет модель User
      trim: true,
      default: 'Администратор',
    },
    contentBlocks: {
      type: Array,
      default: [],
    },
    // Другие поля, если нужны (например, категория, теги)
    // category: {
    //   type: String,
    //   trim: true,
    // },
    // tags: [String],
  },
  {
    timestamps: true, // Добавляет createdAt и updatedAt
  }
);

// Middleware (pre-hook) для генерации slug перед сохранением
articleSchema.pre('validate', function (next) {
  // Генерируем slug только если title изменился или это новый документ
  if (this.isModified('title') || this.isNew) {
    if (this.title) {
      this.slug = generateSlug(this.title);
    } else {
       // Если заголовка нет, создаем случайный slug, чтобы избежать ошибки уникальности
       this.slug = mongoose.Types.ObjectId().toString(); 
    }
  }
  next();
});

// Middleware (pre-hook) для генерации отрывка (excerpt) перед сохранением, если он пуст
articleSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.excerpt && this.content) {
    // Берем первые N символов контента
    const excerptLength = 150; // Длина отрывка
    this.excerpt = this.content.substring(0, excerptLength);
    // Убираем HTML-теги (простая реализация)
    this.excerpt = this.excerpt.replace(/<[^>]*>/g, '');
    // Добавляем многоточие, если текст был обрезан
    if (this.content.length > excerptLength) {
      this.excerpt += '...';
    }
  }
  next();
});


const Article = mongoose.model('Article', articleSchema);

module.exports = Article; 
module.exports.generateSlug = generateSlug; 