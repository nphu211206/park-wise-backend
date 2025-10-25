// routes/pricingRoutes.js (HOÀN TOÀN MỚI)
const express = require('express');
const router = express.Router();
const { estimatePrice } = require('../controllers/pricingController');
const { protect } = require('../middleware/authMiddleware'); // Cần protect để biết user nếu cần

// GET /api/pricing/estimate?parkingLotId=...&startTime=...&endTime=...&vehicleType=...
router.route('/estimate').get(protect, estimatePrice);

// Thêm các route khác liên quan đến pricing sau này (vd: lịch sử giá, cấu hình AI...)

module.exports = router;