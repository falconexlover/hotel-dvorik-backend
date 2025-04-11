const mongoose = require('mongoose');

// Определяем вложенные схемы для лучшей структуры
const bannerSchema = mongoose.Schema({
  title: { type: String, default: 'Добро пожаловать в Лесной Дворик!' },
  subtitle: { type: String, default: 'Ваш уютный отдых на природе' },
  buttonText: { type: String, default: 'Забронировать' },
  buttonLink: { type: String, default: '/booking' },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' }
}, { _id: false });

const aboutSchema = mongoose.Schema({
  title: { type: String, default: 'О нас' },
  content: { type: String, default: 'Подробное описание отеля...' },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' }
}, { _id: false });

const contactSchema = mongoose.Schema({
  title: { type: String, default: 'Контактная информация' },
  address: { type: String, default: 'Адрес не указан' },
  phone: { type: [String], default: [] },
  email: { type: String, default: 'Email не указан' },
}, { _id: false });

// Схема для раздела "Детские праздники"
const partySchema = mongoose.Schema({
  title: { type: String, default: 'Детские праздники' },
  content: { type: String, default: 'Описание для детских праздников...' },
  imageUrls: { type: [String], default: [] }, 
  cloudinaryPublicIds: { type: [String], default: [] }
}, { _id: false });

// Схема для раздела "Конференц-зал"
const conferenceSchema = mongoose.Schema({
  title: { type: String, default: 'Конференц-зал' },
  content: { type: String, default: 'Описание конференц-зала...' },
  imageUrls: { type: [String], default: [] }, 
  cloudinaryPublicIds: { type: [String], default: [] }
}, { _id: false });

// Основная схема
const homepageContentSchema = mongoose.Schema(
  {
    identifier: {
      type: String,
      default: 'main',
      unique: true,
    },
    aboutText: {
      type: String,
      default: 'Подробное описание отеля...',
    },
    banner: { type: bannerSchema, default: () => ({}) },
    about: { type: aboutSchema, default: () => ({}) },
    contact: { type: contactSchema, default: () => ({}) },
    party: { type: partySchema, default: () => ({}) },
    conference: { type: conferenceSchema, default: () => ({}) }
  },
  {
    timestamps: true,
  }
);

homepageContentSchema.statics.getSingleton = async function () {
  let content = await this.findOne({ identifier: 'main' });
  if (!content) {
    content = await this.create({ identifier: 'main' });
  }
  return content;
};

const HomepageContent = mongoose.model('HomepageContent', homepageContentSchema);

module.exports = HomepageContent; 