const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        
        // Lưu trữ vị trí địa lý theo chuẩn GeoJSON.
        // Cấu trúc này cho phép MongoDB thực hiện các truy vấn không gian hiệu năng cao
        // (ví dụ: tìm tất cả các điểm trong một vòng tròn, tìm điểm gần nhất).
        location: {
            type: {
                type: String,
                enum: ['Point'], // Bắt buộc phải là 'Point' cho truy vấn geo
                default: 'Point'
            },
            coordinates: {
                type: [Number], // Mảng chứa [kinh độ, vĩ độ]
                required: true
            }
        },
        
        totalSpots: { type: Number, required: true },
        availableSpots: { type: Number, required: true },
        basePrice: { type: Number, required: true },
        
        // --- Tích hợp Hệ thống Đánh giá ---
        // Điểm rating trung bình, được tính toán mỗi khi có review mới.
        rating: { type: Number, required: true, default: 0 },
        // Tổng số lượt review, giúp tăng độ tin cậy của điểm rating.
        numReviews: { type: Number, required: true, default: 0 },
        // Mảng chứa các ID của tất cả các review liên quan đến bãi xe này.
        // `ref: 'Review'` tạo ra một liên kết đến Review model.
        reviews: [
            { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Review' 
            }
        ],
        // ------------------------------------

        // Trạng thái hoạt động của bãi xe
        status: { 
            type: String, 
            enum: ['active', 'maintenance', 'full', 'closed'], 
            default: 'active' 
        },

        // Danh sách các tiện ích của bãi xe
        facilities: [{ type: String }] // Ví dụ: ["An ninh 24/7", "Camera giám sát"]
    },
    {
        timestamps: true
    }
);

/**
 * Tạo một chỉ mục không gian 2dsphere trên trường `location`.
 * Đây là bước tối ưu hóa CỰC KỲ QUAN TRỌNG, giúp các truy vấn tìm kiếm
 * bãi xe theo vị trí (tìm gần tôi) nhanh hơn gấp nhiều lần.
 * Thiếu dòng này, ứng dụng sẽ rất chậm khi có nhiều bãi xe.
 */
parkingLotSchema.index({ location: '2dsphere' });

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);
module.exports = ParkingLot;