// ===================================================================================
//
// 			BOOKING ROUTES (ULTIMATE FINAL - FAKE PAYMENT & DETAILED)
// 			Bản đồ chỉ đường đã được đồng bộ hóa với controller mới nhất.
//
// ===================================================================================

const express = require('express');
const router = express.Router();

// --- PHẦN 1: IMPORT CÁC HÀM XỬ LÝ LOGIC TỪ CONTROLLER ---
// Import đầy đủ các hàm xử lý logic từ phiên bản controller đã được nâng cấp.
// Tên hàm `createAndPayBooking` được sử dụng thay cho `createBooking` cũ.
const { 
    createAndPayBooking, 
    getMyBookings, 
    getAllBookings, 
    cancelMyBooking, 
    updateBookingStatusByAdmin 
} = require('../controllers/bookingController');

// --- PHẦN 2: IMPORT CÁC VỆ SĨ MIDDLEWARE ---
// `protect`: Đảm bảo người dùng đã đăng nhập.
// `admin`: Đảm bảo người dùng có vai trò là admin.
const { protect, admin } = require('../middleware/authMiddleware');


// --- PHẦN 3: ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN API ---

/**
 * @route   POST /api/bookings/create-and-pay
 * @desc    Người dùng tạo và thanh toán (giả lập) cho một đơn đặt chỗ.
 * @access  Private (Yêu cầu phải đăng nhập)
 */
router.route('/create-and-pay').post(protect, createAndPayBooking);

/**
 * @route   GET /api/bookings
 * @desc    Admin lấy danh sách tất cả các lượt đặt chỗ trong toàn bộ hệ thống.
 * @access  Private/Admin (Yêu cầu phải đăng nhập và là Admin)
 */
router.route('/').get(protect, admin, getAllBookings);

/**
 * @route   GET /api/bookings/mybookings
 * @desc    Người dùng lấy danh sách các lượt đặt chỗ của chính mình để xem lịch sử.
 * @access  Private (Yêu cầu phải đăng nhập)
 */
router.route('/mybookings').get(protect, getMyBookings);

/**
 * @route   DELETE /api/bookings/:id/cancel
 * @desc    Người dùng hủy một lượt đặt chỗ (chưa diễn ra) của chính mình bằng ID của booking.
 * @access  Private (Yêu cầu phải đăng nhập)
 */
router.route('/:id/cancel').delete(protect, cancelMyBooking);

/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Admin cập nhật trạng thái của một lượt đặt chỗ bất kỳ bằng ID của booking.
 * @access  Private/Admin (Yêu cầu phải đăng nhập và là Admin)
 */
router.route('/:id/status').put(protect, admin, updateBookingStatusByAdmin);


module.exports = router;