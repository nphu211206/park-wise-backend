// File: ./routes/reviewRoutes.js

const express = require('express');
const router = express.Router();

// ----- CÁC ĐỊNH TUYẾN (ROUTES) VỀ ĐÁNH GIÁ (REVIEW) SẼ ĐƯỢC THÊM VÀO ĐÂY -----

// Ví dụ một route GET cơ bản
// GET /api/reviews/
router.get('/', (req, res) => {
    res.json({ message: 'Đây là API cho phần đánh giá' });
});

// Ví dụ một route POST cơ bản
// POST /api/reviews/
router.post('/', (req, res) => {
    // Logic để tạo một đánh giá mới
    res.json({ message: 'Tạo đánh giá mới thành công' });
});


module.exports = router;