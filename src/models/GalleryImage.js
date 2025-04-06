const mongoose = require('mongoose');

const galleryImageSchema = mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Территория', 'Номера', 'Кафе', 'Другое'], // Примерные категории
      default: 'Другое',
    },
    description: {
      type: String,
      required: false,
    },
    // Можно добавить поле для ID в облачном хранилище (если используется, напр. Cloudinary)
    // cloudinaryId: {
    //   type: String,
    // }
    cloudinaryPublicId: { // Добавляем поле для public_id из Cloudinary
      type: String,
      required: false, // Может быть не у всех старых записей
    },
  },
  {
    timestamps: true,
  }
);

const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);

module.exports = GalleryImage; 