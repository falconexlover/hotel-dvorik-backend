const mongoose = require('mongoose');

const roomSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: false
  },
  cloudinaryPublicId: {
    type: String,
    required: false
  },
  price: {
    type: String,
    required: true
  },
  priceValue: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  features: {
    type: [String],
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 