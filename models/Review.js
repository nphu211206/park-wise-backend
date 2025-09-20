const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
    {
        // Liên kết đến người dùng đã viết đánh giá.
        // Giúp truy xuất thông tin người dùng từ một lượt review.
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: 'User' 
        },
        
        // Liên kết đến bãi xe được đánh giá.
        parkingLot: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: 'ParkingLot'
        },
        
        // Lưu lại tên người dùng trực tiếp trong review để truy vấn nhanh hơn,
        // không cần populate() mỗi lần chỉ để lấy tên.
        name: { 
            type: String, 
            required: true 
        },

        // Điểm xếp hạng, là một số từ 1 đến 5.
        rating: { 
            type: Number, 
            required: true,
            min: 1,
            max: 5
        },
        
        // Nội dung bình luận, là bắt buộc.
        comment: { 
            type: String, 
            required: true 
        },
    }, 
    {
        timestamps: true,
    }
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;