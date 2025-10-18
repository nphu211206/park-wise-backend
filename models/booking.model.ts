import mongoose, { Schema, Document } from 'mongoose';

const BookingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parkingLot: { type: Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
  spotNumber: { type: String }, // Chỗ đỗ cụ thể được gán
  
  licensePlate: { type: String, required: true }, // Biển số xe (Phần "Định danh")
  
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  checkInTime: { type: Date }, // Thời gian check-in thực tế
  checkOutTime: { type: Date }, // Thời gian check-out thực tế
  
  totalCost: { type: Number, required: true }, // Chi phí tính lúc đặt
  finalCost: { type: Number }, // Chi phí thực tế (nếu ở quá giờ)
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },

  qrCode: { type: String } // Chuỗi QR code để check-in

}, { timestamps: true });

// Tự động chuyển 'confirmed' -> 'expired' nếu quá giờ mà không check-in
// (Việc này nên được xử lý bằng một cron job)

export const Booking = mongoose.model('Booking', BookingSchema);