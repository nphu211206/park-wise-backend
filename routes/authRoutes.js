// routes/authRoutes.js (PHIÊN BẢN ĐẲNG CẤP)
// Quản lý các API liên quan đến Xác thực (Đăng ký, Đăng nhập)

const express = require('express');
const router = express.Router();

// Import các hàm xử lý từ authController
const {
    registerUser, // Hàm đăng ký người dùng mới
    authUser      // Hàm xác thực (đăng nhập) người dùng
} = require('../controllers/authController'); // Đường dẫn đến controller xác thực

// --- Định nghĩa các Routes ---

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản người dùng mới
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập vào hệ thống
 * @access  Public
 */
router.post('/login', authUser);

// --- (Bùng nổ) Các Routes Xác thực Nâng cao (Sẽ thêm sau) ---
// Ví dụ:
// router.post('/forgot-password', forgotPassword); // Gửi email reset mật khẩu
// router.put('/reset-password/:resetToken', resetPassword); // Đặt lại mật khẩu
// router.get('/verify-email/:verifyToken', verifyEmail); // Xác thực email
// router.post('/google', authWithGoogle); // Đăng nhập bằng Google
// router.post('/facebook', authWithFacebook); // Đăng nhập bằng Facebook

module.exports = router; // Xuất router để server.js có thể sử dụng