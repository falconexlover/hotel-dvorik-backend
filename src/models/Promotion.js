const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Название акции обязательно'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  discountType: {
    type: String,
    required: [true, 'Тип скидки обязателен'],
    enum: {
      values: ['percentage', 'fixed_amount'],
      message: 'Тип скидки должен быть percentage или fixed_amount',
    },
  },
  discountValue: {
    type: Number,
    required: [true, 'Значение скидки обязательно'],
    min: [0, 'Значение скидки не может быть отрицательным'],
  },
  code: {
    type: String,
    trim: true,
    uppercase: true, // Промокоды обычно в верхнем регистре
    // unique: true, // Раскомментировать, если промокоды должны быть уникальны
    // sparse: true, // Необходимо для unique, если поле не обязательное
  },
  startDate: {
    type: Date,
    // default: Date.now, // Можно установить дату начала по умолчанию
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Дополнительные поля (можно добавить позже)
  // applicableTo: {
  //   type: String,
  //   enum: ['all', 'rooms', 'services'], // Пример
  //   default: 'all',
  // },
  // applicableItems: [{ // Массив ID номеров или услуг, если applicableTo не 'all'
  //   type: mongoose.Schema.Types.ObjectId, 
  // }], 
  // usageLimit: { 
  //   type: Number, 
  //   min: 1 
  // },
  // currentUsage: { 
  //   type: Number, 
  //   default: 0 
  // },

}, {
  timestamps: true, // Добавляет createdAt и updatedAt
});

// Индекс для промокода, если он должен быть уникальным
// promotionSchema.index({ code: 1 }, { unique: true, sparse: true });

// Валидация: если endDate указана, она должна быть позже startDate
promotionSchema.pre('save', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    next(new Error('Дата окончания не может быть раньше даты начала'));
  } else {
    next();
  }
});

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion; 