const mongoose = require('mongoose');

const roomSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  imageUrls: {
    type: [String],
    required: false
  },
  cloudinaryPublicIds: {
    type: [String],
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
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 