// File: models/productModel.js (Nội dung mới)

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Sản phẩm phải có tên'],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Sản phẩm phải có giá'],
    },
    imageUrl: {
        type: String,
        required: [true, 'Sản phẩm phải có ảnh'],
    },
    // (Thêm mới) Link gốc của sản phẩm để người dùng click vào
    affiliateLink: {
        type: String,
        required: [true, 'Sản phẩm phải có link liên kết'],
        unique: true, // Đảm bảo không cào trùng sản phẩm
    },
    // (Thêm mới) Trang web nguồn (ví dụ: 'FPTShop')
    source: {
        type: String,
        required: [true, 'Phải có nguồn của sản phẩm'],
    },
    // (Thêm mới) Thời gian cào dữ liệu
    scrapedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true // Tự động thêm createdAt và updatedAt
});

// Indexing để tìm kiếm nhanh hơn
productSchema.index({ name: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;