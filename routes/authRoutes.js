const express = require('express');
const { registerUser, authUser } = require('../controllers/authController');
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Đường dẫn để đăng ký một tài khoản người dùng mới.
 * @access  Public (Không cần xác thực)
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Đường dẫn để người dùng đăng nhập và nhận về JSON Web Token (JWT).
 * @access  Public (Không cần xác thực)
 */
router.post('/login', authUser);


module.exports = router;