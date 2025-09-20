const express = require('express');
const router = express.Router();

// Import các hàm xử lý logic từ parkingLotController
const { 
    createParkingLot, 
    getParkingLots, 
    getParkingLotById,
    updateParkingLot,
    deleteParkingLot
} = require('../controllers/parkingLotController');

// Import thêm hàm xử lý logic từ reviewController
const { createParkingLotReview } = require('../controllers/reviewController');

// Import các vệ sĩ middleware
const { protect, admin } = require('../middleware/authMiddleware.js');

// --- CÁC ROUTES CHO BÃI XE ---
router.route('/')
    .get(protect, getParkingLots)
    .post(protect, admin, createParkingLot);

router.route('/:id')
    .get(protect, getParkingLotById)
    .put(protect, admin, updateParkingLot)
    .delete(protect, admin, deleteParkingLot);

// --- ROUTE CHO ĐÁNH GIÁ (TÍCH HỢP) ---
/**
 * @route   POST /api/parking-lots/:id/reviews
 * @desc    Người dùng tạo một đánh giá mới cho bãi xe có ID là :id.
 * @access  Private (Yêu cầu đăng nhập)
 */
router.route('/:id/reviews')
    .post(protect, createParkingLotReview);


module.exports = router;