// ===================================================================================
//
// 			PRODUCT DATA MODEL (mongoose.Schema)
// 			Định nghĩa cấu trúc cho một đối tượng "Product" (Sản phẩm gợi ý).
//
// ===================================================================================

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        // Tên của sản phẩm, là bắt buộc và phải là duy nhất.
        name: { 
            type: String, 
            required: [true, 'Vui lòng nhập tên sản phẩm'],
            unique: true
        },
        
        // Đường dẫn đến hình ảnh minh họa cho sản phẩm.
        // Sau này có thể tích hợp với dịch vụ upload ảnh như Cloudinary.
        imageUrl: {
            type: String,
            required: [true, 'Vui lòng cung cấp URL hình ảnh']
        },

        // Mô tả ngắn gọn, hấp dẫn về sản phẩm.
        description: {
            type: String,
            required: [true, 'Vui lòng nhập mô tả sản phẩm']
        },
        
        // Giá tham khảo của sản phẩm (dưới dạng chuỗi để linh hoạt).
        price: {
            type: String,
            required: [true, 'Vui lòng nhập giá tham khảo']
        },

        // Link Affiliate: Đường dẫn để người dùng click vào và mua hàng.
        // Đây là cốt lõi của mô hình kinh doanh này.
        affiliateUrl: {
            type: String,
            required: [true, 'Vui lòng cung cấp link affiliate']
        },
        
        // Danh mục sản phẩm để dễ dàng phân loại và gợi ý sau này.
        category: {
            type: String,
            required: [true, 'Vui lòng nhập danh mục sản phẩm'],
            default: 'Phụ kiện ô tô'
        },

        // Người dùng đã tạo sản phẩm này (chỉ có thể là Admin).
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;