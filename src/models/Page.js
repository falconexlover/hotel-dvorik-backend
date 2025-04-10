const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: true,
    unique: true, // ID страницы (например, 'conference', 'party', 'homepage')
    index: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Позволяет хранить любую структуру JSON
    required: true,
    default: {}, // По умолчанию пустой объект
  },
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema); 