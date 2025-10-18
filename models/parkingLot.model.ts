import mongoose, { Schema, Document } from 'mongoose';

// Interface cho một "Chỗ đỗ" cụ thể (để quản lý chính xác)
const ParkingSpotSchema = new Schema({
  spotNumber: { type: String, required: true }, // A01, A02, B01...
  isOccupied: { type: Boolean, default: false },
  spotType: { 
    type: String, 
    enum: ['standard', 'large', 'electric_vehicle', 'disabled'], // Phân loại chỗ
    default: 'standard' 
  }
});

// Interface cho "Vị trí địa lý"
const GeoSchema = new Schema({
  type: {
    type: String,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [kinh độ, vĩ độ]
    index: '2dsphere' // Quan trọng cho tìm kiếm "gần đây"
  }
});

// Interface cho "Tiện ích"
const AmenitySchema = new Schema({
  hasEVCharger: { type: Boolean, default: false }, // Sạc điện
  hasRoof: { type: Boolean, default: false },      // Có mái che
  hasSecurity: { type: Boolean, default: false },   // Bảo vệ
  is24h: { type: Boolean, default: false }          // 24/7
});

const ParkingLotSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' }, // Tài khoản chủ bãi xe
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  location: { type: GeoSchema, required: true }, // Để tìm trên bản đồ
  
  capacity: { type: Number, required: true }, // Tổng số chỗ
  availableSpots: { type: Number, required: true }, // Số chỗ trống (cache)
  
  spots: [ParkingSpotSchema], // Quản lý chi tiết từng chỗ
  
  hourlyRate: { type: Number, required: true }, // Giá CƠ SỞ
  
  // Dành cho AI pricing (cấu hình bởi admin)
  pricingFactors: {
    peakHours: [{
      start: String, // "08:00"
      end: String,   // "17:00"
      multiplier: Number // 1.5 (tăng 50%)
    }],
    weekendMultiplier: { type: Number, default: 1.2 }
  },
  
  amenities: AmenitySchema, // Tiện ích
  
  images: [{ type: String }], // Danh sách URL hình ảnh
  
  ratingAverage: { type: Number, default: 4.5, min: 1, max: 5 },
  ratingQuantity: { type: Number, default: 0 }

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtuals để tính toán động
ParkingLotSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'parkingLot',
  localField: '_id'
});

// Cập nhật availableSpots khi isOccupied thay đổi
ParkingLotSchema.pre('save', function(next) {
  if (this.isModified('spots')) {
    this.availableSpots = this.spots.filter(spot => !spot.isOccupied).length;
  }
  next();
});

export const ParkingLot = mongoose.model('ParkingLot', ParkingLotSchema);