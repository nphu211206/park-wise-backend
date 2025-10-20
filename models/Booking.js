const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        // Liên kết đến người dùng đã đặt chỗ.
        // `ref: 'User'` cho phép chúng ta dùng .populate() để lấy thông tin chi tiết
        // của người dùng (như tên, email) chỉ bằng một truy vấn.
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: 'User'
        },

        // Liên kết đến bãi xe đã được đặt.
        parkingLot: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: 'ParkingLot'
        },

        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },

        // Lưu lại giá cuối cùng tại thời điểm đặt chỗ,
        // vì giá bãi xe có thể thay đổi trong tương lai (do giá động).
        totalPrice: { type: Number, required: true },

        // Thông tin tùy chọn
        vehicleNumber: { type: String },

        // Trạng thái của lượt đặt chỗ, được kiểm soát chặt chẽ bằng `enum`.
        status: {
            type: String,
            required: true,
            enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
            default: 'confirmed'
        }
    },
    {
        timestamps: true
    }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;