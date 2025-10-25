// routes/userRoutes.js (Thêm routes cho Vehicles)

const express = require('express');
const router = express.Router();

const {
    getUserProfile,
    updateUserProfile,
    getUsers,
    // Import các hàm CRUD vehicles mới
    addUserVehicle,
    getUserVehicles,
    updateUserVehicle,
    deleteUserVehicle
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// --- Routes cho Profile cá nhân ---
router.route('/profile')
    .get(protect, getUserProfile)      // Lấy profile (giờ đã bao gồm vehicles)
    .put(protect, updateUserProfile);  // Cập nhật profile cơ bản

// --- (Bùng nổ 💥) Routes cho quản lý Xe của người dùng ---
router.route('/profile/vehicles')
    .post(protect, addUserVehicle)     // Thêm xe mới
    .get(protect, getUserVehicles);    // Lấy danh sách xe

router.route('/profile/vehicles/:vehicleId')
    .put(protect, updateUserVehicle)   // Cập nhật xe (nickname, type, isDefault)
    .delete(protect, deleteUserVehicle); // Xóa xe

// --- Routes cho Admin ---
router.route('/')
    .get(protect, admin, getUsers);    // Lấy danh sách tất cả user

// Thêm các routes admin khác (xem chi tiết user, khóa user...) nếu cần

module.exports = router;