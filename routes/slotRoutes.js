// routes/slotRoutes.js (HOÀN TOÀN MỚI)
const express = require('express');
const router = express.Router();
const {
    updateSlotStatus,
    deleteSlot
} = require('../controllers/slotController');
const { protect, admin } = require('../middleware/authMiddleware');

// API cho IoT/Admin cập nhật trạng thái
router.route('/:slotId/status').put(protect, admin, updateSlotStatus);

// API cho Admin xóa 1 ô
router.route('/:slotId').delete(protect, admin, deleteSlot);

module.exports = router;