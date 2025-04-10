const express = require('express');
const { handleYookassaWebhook } = require('../controllers/paymentController');

const router = express.Router();

router.post('/yookassa/webhook', handleYookassaWebhook);

module.exports = router; 