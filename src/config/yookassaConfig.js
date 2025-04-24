const YooKassa = require('yookassa');

const shopId = process.env.YOOKASSA_SHOP_ID;
const secretKey = process.env.YOOKASSA_SECRET_KEY;

if (!shopId || !secretKey) {
  console.error('\n*** ОШИБКА: Не заданы переменные окружения для ЮKassa (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY) в .env файле! ***\n');
}

const yooKassa = new YooKassa({
  shopId: shopId || 'test_shop_id', // Используем заглушку, если переменные не заданы
  secretKey: secretKey || 'test_secret_key' // Используем заглушку
});

module.exports = yooKassa; 