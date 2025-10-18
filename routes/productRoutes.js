// File: routes/productRoutes.js (Nội dung mới)

const express = require('express');
const productController = require('../controllers/productController');
const router = express.Router();

// Định nghĩa các điểm cuối (endpoints) API

// GET /api/products  -> Lấy tất cả sản phẩm để hiển thị
router.get('/', productController.getAllProducts);

// POST /api/products/scrape -> Kích hoạt việc cào dữ liệu
router.post('/scrape', productController.scrapeAndSaveProducts);

module.exports = router;