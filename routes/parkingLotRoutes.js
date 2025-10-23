// routes/parkingLotRoutes.js (PHIÊN BẢN ĐẲNG CẤP)
const express = require('express');
const router = express.Router();
const {
    createParkingLot,
    getParkingLots,
    getParkingLotById,
    getParkingLotStatistics,
    updateParkingLot,
    deleteParkingLot
} = require('../controllers/parkingLotController');
const { addSlotsToParkingLot } = require('../controllers/slotController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/parking-lots (Tìm kiếm, Lọc)
router.route('/').get(getParkingLots);

// POST /api/parking-lots (Admin tạo bãi mới)
router.route('/').post(protect, admin, createParkingLot);

// GET /api/parking-lots/:id (Lấy chi tiết bãi, bao gồm TẤT CẢ slots)
router.route('/:id').get(protect, getParkingLotById);

// PUT /api/parking-lots/:id (Admin cập nhật bãi)
router.route('/:id').put(protect, admin, updateParkingLot);

// DELETE /api/parking-lots/:id (Admin xóa bãi)
router.route('/:id').delete(protect, admin, deleteParkingLot);

// GET /api/parking-lots/:id/statistics (Lấy dữ liệu biểu đồ AI)
router.route('/:id/statistics').get(protect, getParkingLotStatistics);

// POST /api/parking-lots/:id/slots (Admin thêm ô mới vào bãi)
router.route('/:id/slots').post(protect, admin, addSlotsToParkingLot);

module.exports = router;