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
      enum: ['rooms', 'sauna', 'conference', 'territory', 'party'],
      default: 'territory',
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