// routes/userRoutes.js (PHIÊN BẢN ĐẲNG CẤP)
// Quản lý các API liên quan đến Người dùng (Profile, Quản lý User)

const express = require('express');
const router = express.Router();

// Import controllers và middleware
const {
    getUserProfile,     // Lấy thông tin profile của user đang đăng nhập
    updateUserProfile,  // Cập nhật profile của user đang đăng nhập
    getUsers            // (Admin) Lấy danh sách tất cả user
} = require('../controllers/userController'); // Đường dẫn đến userController
const { protect, admin } = require('../middleware/authMiddleware'); // Middleware xác thực và phân quyền

// --- Định nghĩa các Routes ---

/**
 * @route   GET /api/users/profile
 * @desc    Lấy thông tin hồ sơ cá nhân
 * @access  Private (Yêu cầu đăng nhập - dùng middleware `protect`)
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Cập nhật thông tin hồ sơ cá nhân
 * @access  Private (Yêu cầu đăng nhập - dùng middleware `protect`)
 */
router.put('/profile', protect, updateUserProfile);

/**
 * @route   GET /api/users
 * @desc    (Admin) Lấy danh sách tất cả người dùng
 * @access  Private/Admin (Yêu cầu đăng nhập VÀ là admin - dùng cả `protect` và `admin`)
 */
router.get('/', protect, admin, getUsers);

// --- (Bùng nổ) Các Routes Quản lý User Nâng cao (Admin - Sẽ thêm sau) ---
// Ví dụ:
// router.get('/:id', protect, admin, getUserById); // Lấy thông tin chi tiết 1 user
// router.put('/:id', protect, admin, updateUserById); // Admin cập nhật thông tin user khác
// router.delete('/:id', protect, admin, deleteUser); // Admin xóa user
// router.put('/:id/block', protect, admin, blockUser); // Admin khóa tài khoản

module.exports = router;