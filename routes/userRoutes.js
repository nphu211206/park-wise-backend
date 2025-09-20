// routes/userRoutes.js (Bản Hoàn thiện)
const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    getUserProfile, 
    updateUserProfile,
    deleteUser,
    updateUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route cho người dùng tự thao tác với hồ sơ của mình
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Route cho Admin lấy danh sách tất cả người dùng
router.route('/')
    .get(protect, admin, getUsers);

// Route cho Admin thao tác trên một người dùng cụ thể bằng ID
router.route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;