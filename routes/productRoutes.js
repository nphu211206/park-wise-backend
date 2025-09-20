// ===================================================================================
// ===================================================================================
//
// 			PRODUCT ROUTES - BẢN ĐỒ API CHO MODULE SẢN PHẨM GỢI Ý
// 			Đây là phiên bản đầy đủ, chi tiết và được chú thích cặn kẽ nhất.
//
// ===================================================================================

// --- PHẦN 1: IMPORT CÁC MODULE CẦN THIẾT ---

// Import framework Express để có thể tạo router
const express = require('express');

// Import các hàm xử lý logic từ file productController.
// Việc này tách biệt rõ ràng giữa việc định nghĩa đường dẫn và việc xử lý logic,
// là một quy tắc thiết kế đẳng cấp giúp mã nguồn dễ bảo trì.
const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController.js');

// Import các "vệ sĩ" middleware để bảo vệ các đường dẫn API.
// `protect` đảm bảo người dùng đã đăng nhập.
// `admin` đảm bảo người dùng có vai trò là Quản trị viên.
const { protect, admin } = require('../middleware/authMiddleware.js');

// --- PHẦN 2: KHỞI TẠO ROUTER ---

// Tạo một instance của Express Router.
// Router này sẽ chứa tất cả các định nghĩa đường dẫn cho sản phẩm.
const router = express.Router();

// --- PHẦN 3: ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN (ROUTES) ---

/**
 * Định nghĩa các hành động cho đường dẫn gốc ('/'), tương ứng với URL đầy đủ là `/api/products`
 * Kỹ thuật .route('/') cho phép nối chuỗi nhiều phương thức HTTP (GET, POST,...) cho cùng một đường dẫn.
 */
router.route('/')
    /**
     * @method  GET
     * @desc    Lấy danh sách sản phẩm gợi ý (một cách ngẫu nhiên).
     * @access  Private (Yêu cầu phải đăng nhập - `protect`)
     * @handler getProducts
     */
    .get(protect, getProducts)
    
    /**
     * @method  POST
     * @desc    Admin tạo một sản phẩm mới.
     * @access  Private/Admin (Yêu cầu phải đăng nhập VÀ phải là Admin - `protect`, `admin`)
     * @handler createProduct
     */
    .post(protect, admin, createProduct);

/**
 * Định nghĩa các hành động cho đường dẫn có tham số ID ('/:id'), 
 * tương ứng với URL đầy đủ là `/api/products/xxxxxxxxxxxx` (với x là ID của sản phẩm).
 */
router.route('/:id')
    /**
     * @method  PUT
     * @desc    Admin cập nhật thông tin một sản phẩm dựa trên ID.
     * @access  Private/Admin (Yêu cầu phải đăng nhập VÀ phải là Admin)
     * @handler updateProduct
     */
    .put(protect, admin, updateProduct)

    /**
     * @method  DELETE
     * @desc    Admin xóa một sản phẩm dựa trên ID.
     * @access  Private/Admin (Yêu cầu phải đăng nhập VÀ phải là Admin)
     * @handler deleteProduct
     */
    .delete(protect, admin, deleteProduct);

// --- PHẦN 4: EXPORT ROUTER ---

// Xuất khẩu toàn bộ router đã được cấu hình để file `server.js` có thể sử dụng.
module.exports = router;