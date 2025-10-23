// routes/bookingRoutes.js (PHIÊN BẢN ĐẲNG CẤP)
const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    cancelMyBooking,
    getAllBookings,
    updateBookingStatusByAdmin
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

// POST /api/bookings (User tạo booking mới - dựa trên slotId)
router.route('/').post(protect, createBooking);

// GET /api/bookings (Admin xem tất cả)
router.route('/').get(protect, admin, getAllBookings);

// GET /api/bookings/mybookings (User xem lịch sử)
router.route('/mybookings').get(protect, getMyBookings);

// PUT /api/bookings/:id/cancel (User tự hủy)
router.route('/:id/cancel').put(protect, cancelMyBooking);

// PUT /api/bookings/:id/status (Admin cập nhật: check-in, check-out)
router.route('/:id/status').put(protect, admin, updateBookingStatusByAdmin);

module.exports = router;