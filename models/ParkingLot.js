// models/ParkingLot.js (PHIÊN BẢN ĐẲNG CẤP THẾ GIỚI)
// Mô hình này quản lý chi tiết đến từng Ô ĐỖ XE (Slot)

const mongoose = require('mongoose');

/**
 * Schema cho từng Ô đỗ xe (Slot)
 * Đây là trái tim của hệ thống "định danh thông minh"
 */
const slotSchema = new mongoose.Schema({
    // Tên định danh cho ô, ví dụ: 'A-01', 'Hầm B2-KhuC-15'
    identifier: { 
        type: String, 
        required: [true, 'Mã định danh ô là bắt buộc'], 
        trim: true 
    },
    // Trạng thái của ô
    status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'maintenance'],
        default: 'available'
    },
    // Loại xe mà ô này hỗ trợ (ví dụ: ô nhỏ cho xe máy, ô lớn cho SUV)
    vehicleType: {
        type: String,
        enum: ['motorbike', 'car_4_seats', 'car_7_seats', 'suv', 'ev_car', 'any'],
        default: 'any'
    },
    // (Mở rộng) Liên kết với cảm biến IoT nếu có
    sensorId: { 
        type: String, 
        trim: true,
        default: null
    },
    // Liên kết trực tiếp đến lượt booking đang chiếm giữ ô này (nếu có)
    currentBooking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    }
}, {
    timestamps: true // Ghi lại thời gian lần cuối ô này thay đổi trạng thái
});

/**
 * Schema cho Bãi đỗ xe (ParkingLot)
 * Quản lý thông tin chung và chứa danh sách các Ô đỗ xe (Slots)
 */
const parkingLotSchema = new mongoose.Schema(
    {
        // Tên bãi xe (VD: Bãi xe Hầm B1 Vincom Mega Mall)
        name: { 
            type: String, 
            required: [true, 'Tên bãi xe là bắt buộc'], 
            trim: true 
        },
        // Địa chỉ chi tiết
        address: { 
            type: String, 
            required: [true, 'Địa chỉ là bắt buộc'], 
            trim: true 
        },
        // Vị trí địa lý (RẤT QUAN TRỌNG, bạn đã làm tốt)
        location: {
            type: {
                type: String,
                enum: ['Point'], 
                default: 'Point'
            },
            coordinates: { // [Kinh độ (longitude), Vĩ độ (latitude)]
                type: [Number], 
                required: [true, 'Tọa độ là bắt buộc']
            }
        },

        // --- Thông tin Vận hành ---

        // Liên kết đến chủ sở hữu (cho mô hình SaaS)
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // required: true // Sẽ bật khi triển khai mô hình SaaS
        },
        // Giờ mở cửa
        openingHours: {
            open: { type: String, default: '00:00' }, // VD: '06:00'
            close: { type: String, default: '23:59' }, // VD: '23:00'
            is24h: { type: Boolean, default: true }
        },
        // Trạng thái chung của bãi xe
        status: { 
            type: String, 
            enum: ['active', 'maintenance', 'full', 'closed'], 
            default: 'active' 
        },

        // --- Thông tin "Sang trọng" (cho UI) ---

        // Danh sách URLs hình ảnh (chất lượng cao)
        images: [{ type: String }], 
        // Mô tả chi tiết, đẳng cấp
        description: { type: String, trim: true },
        // Các tiện ích (giống eldoradostone.com, họ có "features")
        amenities: [
            {
                type: String,
                enum: ['covered_parking', 'security_24h', 'cctv', 'car_wash', 'ev_charging', 'valet_parking', 'rooftop']
            }
        ],

        // --- Trái tim của hệ thống: Mảng các Ô đỗ xe ---
        slots: [slotSchema],

        // --- Hệ thống Đánh giá (Bạn đã làm tốt) ---
        rating: { type: Number, required: true, default: 0, min: 0, max: 5 },
        numReviews: { type: Number, required: true, default: 0, min: 0 },

        // --- Hệ thống Giá (Cơ sở) ---
        // Giá này sẽ là cơ sở cho AI tính toán
        pricingTiers: {
            motorbike: { basePricePerHour: { type: Number, required: true, min: 0 } },
            car_4_seats: { basePricePerHour: { type: Number, required: true, min: 0 } },
            suv: { basePricePerHour: { type: Number, required: true, min: 0 } },
            ev_charging_fee: { type: Number, default: 0 } // Phí sạc điện (nếu có)
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// --- Indexes (Tối ưu hóa Tốc độ) ---
// 1. Index cho tìm kiếm vị trí (Bạn đã có)
parkingLotSchema.index({ location: '2dsphere' });
// 2. Index cho tìm kiếm Full-text (Tên và Địa chỉ)
parkingLotSchema.index({ name: 'text', address: 'text', description: 'text' });
// 3. Index để tìm nhanh các ô trống trong một bãi xe
parkingLotSchema.index({ 'slots.status': 1 });


// --- Virtuals (Trường ảo - Không lưu vào DB, chỉ để tính toán) ---

// Tính toán tổng số chỗ
parkingLotSchema.virtual('totalSpots').get(function() {
    return this.slots ? this.slots.length : 0;
});

// Tính toán số chỗ trống (thay thế cho availableSpots cũ)
parkingLotSchema.virtual('availableSpots').get(function() {
    if (!this.slots) return 0;
    return this.slots.filter(slot => slot.status === 'available').length;
});

// Thống kê chi tiết số chỗ trống theo loại xe
parkingLotSchema.virtual('availabilityByType').get(function() {
    if (!this.slots) return {};
    return this.slots.reduce((stats, slot) => {
        if (slot.status === 'available') {
            const type = slot.vehicleType || 'any';
            stats[type] = (stats[type] || 0) + 1;
        }
        return stats;
    }, {});
});


// --- Middleware (Tự động hóa) ---

// Tự động cập nhật trạng thái 'full' của bãi xe
parkingLotSchema.pre('save', function(next) {
    if (this.isModified('slots')) {
        if (this.availableSpots === 0) {
            this.status = 'full';
        } else if (this.status === 'full' && this.availableSpots > 0) {
            this.status = 'active'; // Tự động mở lại khi có chỗ
        }
    }
    next();
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);
module.exports = ParkingLot;