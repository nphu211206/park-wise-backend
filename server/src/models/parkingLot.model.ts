import { Schema, model, Document, Model, Types } from 'mongoose';

// --- Interface cho từng Ô ĐỖ XE (Slot) ---
// Đây là trái tim của hệ thống "định danh thông minh"
export interface ISlot extends Document {
  _id: Types.ObjectId;  
  slotNumber: string; // Số hiệu ô, ví dụ: 'A-01', 'B-12'
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  vehicleType: 'car' | 'motorbike' | 'any'; // Loại xe ô này có thể chứa
  currentBooking?: Types.ObjectId; // Booking ID đang chiếm giữ (nếu có)
  // sensorId?: string; // (Mở rộng) ID của cảm biến IoT tại ô này
}

const SlotSchema = new Schema<ISlot>({
  slotNumber: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available',
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['car', 'motorbike', 'any'],
    default: 'any',
    required: true
  },
  currentBooking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null }
  // sensorId: { type: String }
}, { _id: true }); // Bật _id cho sub-document để có thể tham chiếu trực tiếp

// --- Interface cho Bãi đỗ xe (ParkingLot) ---
export interface IParkingLot extends Document {
  name: string; // Tên bãi xe (VD: Bãi xe Hầm B1 Vincom)
  owner: Types.ObjectId; // ID của người dùng có role 'owner'
  address: string; // Địa chỉ chi tiết
  location: {
    type: 'Point';
    coordinates: [number, number]; // [Kinh độ (longitude), Vĩ độ (latitude)]
  };
  
  // Thông tin chi tiết
  images: string[]; // Danh sách URLs hình ảnh
  description?: string;
  amenities: ('covered' | 'security_24h' | 'cctv' | 'car_wash' | 'ev_charging')[]; // Các tiện ích
  openingHours: {
    open: string; // VD: '06:00'
    close: string; // VD: '23:00'
    is24h: boolean;
  };
  
  // Quản lý ô đỗ xe
  slots: Types.DocumentArray<ISlot>;
  
  // Thông tin giá động (đây là giá CƠ SỞ)
  // Giá cuối cùng sẽ được tính bởi AI service
  pricing: {
    car: { basePricePerHour: number };
    motorbike: { basePricePerHour: number };
  };
  
  // Thông tin thống kê (được cập nhật tự động)
  statistics: {
    totalCapacity: number;
    availableNow: number;
    averageRating: number;
    totalReviews: number;
  };
  
  isVerified: boolean; // Bãi xe đã được admin duyệt chưa
}

// Interface cho Model
export interface IParkingLotModel extends Model<IParkingLot> {}

const ParkingLotSchema = new Schema<IParkingLot, IParkingLotModel>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'], // Bắt buộc là 'Point' cho GeoJSON
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    images: [{ type: String }],
    description: { type: String, trim: true },
    amenities: [
      {
        type: String,
        enum: ['covered', 'security_24h', 'cctv', 'car_wash', 'ev_charging']
      }
    ],
    openingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
      is24h: { type: Boolean, default: false }
    },
    slots: [SlotSchema],
    pricing: {
      car: { basePricePerHour: { type: Number, required: true, min: 0 } },
      motorbike: { basePricePerHour: { type: Number, required: true, min: 0 } }
    },
    statistics: {
      totalCapacity: { type: Number, default: 0, min: 0 },
      availableNow: { type: Number, default: 0, min: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 }
    },
    isVerified: { type: Boolean, default: false }
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Indexes ---
// Đây là index quan trọng nhất cho tìm kiếm "đẳng cấp"
// Hỗ trợ tìm kiếm các bãi xe xung quanh một tọa độ
ParkingLotSchema.index({ location: '2dsphere' });

// Tối ưu tìm kiếm theo tên và địa chỉ
ParkingLotSchema.index({ name: 'text', address: 'text' });

// Tối ưu tìm trạng thái của slot
ParkingLotSchema.index({ 'slots.status': 1 });

// --- Virtuals (Trường ảo) ---
// Tính toán tổng số chỗ và số chỗ trống
ParkingLotSchema.pre('save', function (next) {
  if (this.isModified('slots')) {
    this.statistics.totalCapacity = this.slots.length;
    this.statistics.availableNow = this.slots.filter(
      (slot) => slot.status === 'available'
    ).length;
  }
  next();
});

const ParkingLot = model<IParkingLot, IParkingLotModel>(
  'ParkingLot',
  ParkingLotSchema
);

export default ParkingLot;