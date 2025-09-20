// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { createMoMoPayment, handleMoMoIPN } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// User tạo yêu cầu thanh toán
router.route('/create-momo-payment').post(protect, createMoMoPayment);
// MoMo gửi kết quả về đây
router.route('/momo-ipn').post(handleMoMoIPN);

module.exports = router;