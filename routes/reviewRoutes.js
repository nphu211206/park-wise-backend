// routes/reviewRoutes.js (PHIÊN BẢN ĐẲNG CẤP - HOÀN THIỆN)
// Quản lý tất cả các đường dẫn API liên quan đến Đánh giá (Review)

const express = require('express');
// mergeParams: true là một kỹ thuật "đẳng cấp"
// cho phép route này nhận params từ route cha (ví dụ: /api/parking-lots/:parkingLotId/reviews)
// Tuy nhiên, để đơn giản và tách biệt, chúng ta sẽ dùng route riêng /api/reviews
const router = express.Router(); 
const {
    createParkingLotReview,
    getParkingLotReviews,
    deleteReview,
    updateReview
} = require('../controllers/reviewController'); // Import các hàm xử lý
const { protect, admin } = require('../middleware/authMiddleware'); // Import middleware bảo vệ

// --- Định nghĩa các Routes ---

/**
 * @route   GET /api/reviews/:parkingLotId
 * @desc    Lấy tất cả đánh giá của một bãi xe.
 * @access  Private (Cần login để biết user này có thể review hay không)
 */
router.route('/:parkingLotId')
    .get(protect, getParkingLotReviews);

/**
 * @route   POST /api/reviews/:parkingLotId
 * @desc    Tạo một đánh giá mới cho một bãi xe.
 * @access  Private (Chỉ user đã đăng nhập)
 */
router.route('/:parkingLotId')
    .post(protect, createParkingLotReview); // Dùng hàm bạn đã viết

/**
 * @route   DELETE /api/reviews/:id
 * @desc    (Admin) Xóa một đánh giá.
 * @access  Private/Admin
 */
router.route('/:id')
    .delete(protect, admin, deleteReview); // Placeholder cho chức năng Admin

/**
 * @route   PUT /api/reviews/:id
 * @desc    (Admin) Cập nhật một đánh giá (ví dụ: ẩn/hiện).
 * @access  Private/Admin
 */
router.route('/:id')
    .put(protect, admin, updateReview); // Placeholder cho chức năng Admin

module.exports = router;