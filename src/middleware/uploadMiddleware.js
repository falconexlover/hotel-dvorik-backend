const multer = require('multer');
const path = require('path');

// Настройка хранилища Multer (в памяти, т.к. сразу загружаем в Cloudinary)
const storage = multer.memoryStorage();

// Фильтр файлов (принимаем только изображения)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Ошибка: Разрешены только изображения (jpeg, jpg, png, gif, webp)!'), false);
  }
};

// Middleware для загрузки одного файла
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Лимит 5MB
}).single('image'); // 'image' - это имя поля в FormData

// Middleware для загрузки нескольких файлов
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).array('imageFiles', 10); // 'imageFiles' - имя поля, 10 - макс. кол-во

module.exports = { uploadSingle, uploadMultiple }; 