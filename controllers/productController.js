// ===================================================================================
//
// 			PRODUCT CONTROLLER
// 			Chứa logic xử lý cho các thao tác CRUD liên quan đến Sản phẩm gợi ý.
//
// ===================================================================================

const Product = require('../models/Product');

/**
 * @desc    Lấy danh sách tất cả sản phẩm (hoặc một số lượng ngẫu nhiên).
 * @route   GET /api/products
 * @access  Private (Người dùng đã đăng nhập có thể xem)
 */
const getProducts = async (req, res) => {
    try {
        // Logic thông minh: Lấy ngẫu nhiên 3 sản phẩm để hiển thị cho người dùng.
        // Đây là cách làm gợi ý sản phẩm một cách đa dạng.
        const products = await Product.aggregate([{ $sample: { size: 3 } }]);
        res.json(products);
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * @desc    Admin tạo một sản phẩm mới.
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res) => {
    const { name, imageUrl, description, price, affiliateUrl, category } = req.body;
    try {
        const product = new Product({
            name,
            imageUrl,
            description,
            price,
            affiliateUrl,
            category,
            user: req.user._id // Gán người tạo là admin đang đăng nhập
        });
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error("Lỗi khi tạo sản phẩm:", error);
        res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
    }
};

/**
 * @desc    Admin cập nhật một sản phẩm.
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res) => {
    const { name, imageUrl, description, price, affiliateUrl, category } = req.body;
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.name = name || product.name;
            product.imageUrl = imageUrl || product.imageUrl;
            product.description = description || product.description;
            product.price = price || product.price;
            product.affiliateUrl = affiliateUrl || product.affiliateUrl;
            product.category = category || product.category;
            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
    }
};

/**
 * @desc    Admin xóa một sản phẩm.
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product) {
            res.json({ message: 'Sản phẩm đã được xóa' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
};