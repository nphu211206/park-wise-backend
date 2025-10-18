const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const asyncHandler = require('express-async-handler'); // Cần cài: npm i express-async-handler
const AppError = require('../utils/AppError'); // Cần tạo file này
const { calculatePrice } = require('../utils/priceCalculator'); // File AI pricing

// @desc    Tạo một lượt đặt chỗ mới
// @route   POST /api/bookings
// @access  Private
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { parkingLotId, startTime, endTime, licensePlate } = req.body;
  const userId = req.user.id;

  if (!parkingLotId || !startTime || !endTime || !licensePlate) {
    return next(new AppError('Vui lòng cung cấp đầy đủ thông tin đặt chỗ', 400));
  }

  const parkingLot = await ParkingLot.findById(parkingLotId);
  if (!parkingLot) {
    return next(new AppError('Không tìm thấy bãi đỗ xe', 404));
  }

  const newStartTime = new Date(startTime);
  const newEndTime = new Date(endTime);

  if (newEndTime <= newStartTime) {
    return next(new AppError('Giờ kết thúc phải sau giờ bắt đầu', 400));
  }

  // --- Logic Kiểm tra Xung đột Đặt chỗ (Cực kỳ quan trọng) ---
  // 1. Tìm các chỗ đã bị đặt trong bãi xe này
  const conflictingBookings = await Booking.find({
    parkingLot: parkingLotId,
    status: { $in: ['confirmed', 'active'] }, // Chỉ kiểm tra các booking còn hiệu lực
    $or: [
      // Case 1: Booking mới bắt đầu trong một booking cũ
      { startTime: { $lte: newStartTime }, endTime: { $gt: newStartTime } },
      // Case 2: Booking mới kết thúc trong một booking cũ
      { startTime: { $lt: newEndTime }, endTime: { $gte: newEndTime } },
      // Case 3: Booking mới bao trọn một booking cũ
      { startTime: { $gte: newStartTime }, endTime: { $lte: newEndTime } }
    ]
  });

  if (conflictingBookings.length >= parkingLot.capacity) {
    return next(new AppError('Bãi đỗ đã hết chỗ trong khung giờ bạn chọn. Vui lòng thử giờ khác.', 409));
  }
  
  // --- Logic Tính giá "AI" ---
  // Hàm này sẽ nằm trong 'utils/priceCalculator.js'
  const { totalCost, error } = calculatePrice(parkingLot, newStartTime, newEndTime);
  
  if (error) {
    return next(new AppError(error, 400));
  }

  // --- (Tùy chọn) Tìm một chỗ trống cụ thể ---
  // Đây là logic phức tạp, có thể làm sau. Tạm thời chỉ trừ tổng.
  // const spotNumber = findAvailableSpot(parkingLot, conflictingBookings);

  const booking = await Booking.create({
    user: userId,
    parkingLot: parkingLotId,
    licensePlate,
    startTime: newStartTime,
    endTime: newEndTime,
    totalCost: totalCost,
    status: 'confirmed', // Giả sử đã thanh toán hoặc thanh toán sau
    paymentStatus: 'unpaid'
    // spotNumber: spotNumber
  });
  
  // (Nên dùng real-time) Cập nhật số chỗ trống (tạm thời)
  // Logic này nên được làm kỹ hơn bằng cách dùng spots array
  parkingLot.availableSpots -= 1;
  await parkingLot.save();

  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Lấy tất cả booking của người dùng
// @route   GET /api/bookings/mybookings
// @access  Private
exports.getMyBookings = asyncHandler(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate({
      path: 'parkingLot',
      select: 'name address images' // Chỉ lấy thông tin cần thiết
    })
    .sort({ startTime: -1 }); // Sắp xếp mới nhất lên trước

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc    Hủy đặt chỗ
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Không tìm thấy lượt đặt chỗ', 404));
  }

  // Đảm bảo đúng người dùng mới được hủy
  if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bạn không có quyền thực hiện hành động này', 401));
  }

  // Chỉ cho phép hủy nếu booking đang 'pending' hoặc 'confirmed'
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return next(new AppError(`Không thể hủy lượt đặt đang ở trạng thái ${booking.status}`, 400));
  }
  
  // (Logic Hoàn tiền - sẽ làm khi tích hợp thanh toán)
  // await refundPayment(booking.paymentId);

  booking.status = 'cancelled';
  await booking.save();
  
  // Cập nhật lại số chỗ
  const parkingLot = await ParkingLot.findById(booking.parkingLot);
  parkingLot.availableSpots += 1;
  await parkingLot.save();
  
  res.status(200).json({
    success: true,
    data: booking
  });
});

// --- DÀNH CHO ADMIN ---

// @desc    Lấy tất cả booking (cho Admin)
// @route   GET /api/bookings
// @access  Private (Admin)
exports.getAllBookings = asyncHandler(async (req, res, next) => {
  // Triển khai APIFeatures để admin có thể lọc, tìm kiếm, phân trang
  // const features = new APIFeatures(Booking.find(), req.query)...
  
  const bookings = await Booking.find()
    .populate('user', 'name email')
    .populate('parkingLot', 'name');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});