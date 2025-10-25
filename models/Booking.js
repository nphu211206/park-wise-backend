// models/Booking.js (PHIÊN BẢN ĐẲNG CẤP - ĐỒNG BỘ VỚI CONTROLLER)

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        // --- Liên kết Chính ---
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'ID người dùng là bắt buộc'],
            ref: 'User'
        },
        parkingLot: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'ID bãi xe là bắt buộc'],
            ref: 'ParkingLot'
        },
        // (Bùng nổ) Liên kết trực tiếp đến Ô Đỗ đã chọn
        slot: {
            type: mongoose.Schema.Types.ObjectId,
            // required: [true, 'ID ô đỗ là bắt buộc'], // Bắt buộc khi tạo
            ref: 'ParkingLot.slots', // Tham chiếu đến sub-document slot
            // Validate slot tồn tại trước khi save nếu cần thiết
        },
        // (Bùng nổ) Lưu lại mã định danh của ô (VD: 'A-01') để tiện hiển thị
        slotIdentifier: {
            type: String,
            // required: [true, 'Mã định danh ô là bắt buộc'], // Bắt buộc khi tạo
            trim: true,
        },

        // --- Thông tin Thời gian ---
        startTime: {
            type: Date,
            required: [true, 'Thời gian bắt đầu là bắt buộc'],
            index: true // Index để tối ưu query theo thời gian
        },
        endTime: {
            type: Date,
            required: [true, 'Thời gian kết thúc là bắt buộc'],
            index: true
        },
        // (Bùng nổ) Thời gian check-in/check-out thực tế (nếu khác với đặt trước)
        checkInTime: { type: Date, default: null },
        checkOutTime: { type: Date, default: null },

        // --- Thông tin Chi phí ---
        // Giá TẠI THỜI ĐIỂM ĐẶT CHỖ (có thể khác giá hiện tại của bãi)
        totalPrice: {
            type: Number,
            required: [true, 'Tổng giá tiền là bắt buộc'],
            min: [0, 'Giá tiền không thể âm']
        },
        // (Bùng nổ) Lưu chi tiết giá nếu cần (giá gốc, phụ phí AI, phí dịch vụ...)
        priceDetails: {
            baseParkingFee: Number,
            dynamicSurcharge: Number, // Phụ phí AI
            serviceFee: Number,
            // discountApplied: String, // Mã giảm giá (nếu có)
            // finalCalculatedPrice: Number // Giá cuối cùng sau khi check-out (nếu khác)
        },

        // --- Thông tin Xe ---
        vehicleNumber: {
            type: String,
            trim: true,
            uppercase: true, // Tự động viết hoa biển số
            // index: true // Cân nhắc index nếu cần tìm booking theo biển số nhanh
        },
        vehicleType: {
            type: String,
            required: [true, 'Loại xe là bắt buộc'],
            enum: ['motorbike', 'car_4_seats', 'car_7_seats', 'suv', 'ev_car', 'any'], // Đồng bộ với ParkingLot
        },
        // (Bùng nổ) Liên kết đến Xe đã lưu của người dùng (nếu có)
        // userVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'User.vehicles' },

        // --- Trạng thái & Ghi chú ---
        status: {
            type: String,
            required: true,
            enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'reserved', 'no-show'], // Thêm 'reserved', 'no-show'
            default: 'confirmed', // Hoặc 'pending' nếu cần admin duyệt
            index: true // Index để lọc booking theo trạng thái nhanh
        },
        notes: { // Ghi chú thêm từ người dùng
            type: String,
            trim: true
        },
        // (Bùng nổ) Đánh dấu booking này đã được review chưa
        hasReview: {
             type: Boolean,
             default: false
        }

        // --- (Bùng nổ) Thông tin Thanh toán (Sẽ thêm ở Giai đoạn sau) ---
        // paymentMethod: String,
        // paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
        // transactionId: String,

        // --- (Bùng nổ) Dữ liệu Meta (Ví dụ: nguồn đặt chỗ,...) ---
        // source: { type: String, enum: ['web', 'app', 'admin'], default: 'web' },

    },
    {
        timestamps: true // Tự động thêm createdAt và updatedAt
    }
);

// --- Middleware & Virtuals (Nếu cần) ---

// Ví dụ: Virtual để tính thời gian đỗ xe thực tế (nếu đã check-out)
bookingSchema.virtual('actualDurationMinutes').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = Math.abs(this.checkOutTime - this.checkInTime);
    return Math.round(diffMs / 60000); // Trả về số phút
  }
  return null;
});

// Ví dụ: Kiểm tra trước khi lưu xem endTime có lớn hơn startTime không
bookingSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('Thời gian kết thúc phải sau thời gian bắt đầu.'));
  } else {
    next();
  }
});

// Index tổng hợp để tối ưu query tìm booking của user tại một bãi xe
bookingSchema.index({ user: 1, parkingLot: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;