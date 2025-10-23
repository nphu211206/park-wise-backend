// controllers/bookingController.js (PHIÊN BẢN ĐẲNG CẤP - SLOT-BASED)
// Quản lý logic đặt chỗ chi tiết đến từng Ô (Slot).

const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const User = require('../models/User');
const mongoose = require('mongoose');

// Tạm thời import hàm AI tính giá (sẽ được tạo ở Giai đoạn 3)
// const { calculateDynamicPrice } = require('../utils/priceCalculator');

/**
 * @desc    Tạo một lượt đặt chỗ mới (cho ô cụ thể)
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
    const { 
        slotId,         // Yêu cầu mới: Người dùng phải gửi ID của Ô
        parkingLotId,   // Yêu cầu mới: Cần biết bãi cha của Ô
        startTime, 
        endTime, 
        vehicleNumber,
        vehicleType     // Yêu cầu mới: 'motorbike', 'car_4_seats', 'suv'
    } = req.body;

    if (!slotId || !parkingLotId || !startTime || !endTime || !vehicleType) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin: slotId, parkingLotId, thời gian và loại xe.' });
    }
    
    // Bắt đầu một Transaction (Giao dịch)
    // Đây là kỹ thuật "đẳng cấp" để đảm bảo tính toàn vẹn dữ liệu.
    // Nếu một bước thất bại, tất cả các bước sẽ bị hủy bỏ (rollback).
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
            throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
        }

        // Bước 1: Tìm bãi xe và ô đỗ
        const parkingLot = await ParkingLot.findById(parkingLotId).session(session);
        if (!parkingLot) {
            throw new Error('Không tìm thấy bãi xe.');
        }

        // findById không hoạt động trực tiếp trên sub-document
        const slot = parkingLot.slots.id(slotId); 
        if (!slot) {
            throw new Error('Không tìm thấy ô đỗ xe.');
        }

        // Bước 2: Kiểm tra tính khả dụng của Ô
        if (slot.status !== 'available') {
            throw new Error(`Ô ${slot.identifier} đã bị chiếm hoặc đang được bảo trì.`);
        }
        
        // (Bùng nổ) Kiểm tra xem loại xe của người dùng có khớp với loại ô không
        if (slot.vehicleType !== 'any' && slot.vehicleType !== vehicleType) {
            throw new Error(`Ô ${slot.identifier} chỉ dành cho loại xe ${slot.vehicleType}.`);
        }

        // Bước 3: (AI Định giá) Tính toán chi phí
        // const priceTier = parkingLot.pricingTiers[vehicleType];
        // if (!priceTier) {
        //     throw new Error(`Bãi xe không hỗ trợ loại xe ${vehicleType}.`);
        // }
        // const basePricePerHour = priceTier.basePricePerHour;
        // const dynamicPrice = await calculateDynamicPrice(parkingLot, startTime, vehicleType);
        
        // Logic tính giá tạm thời (thay thế bằng AI sau)
        const priceTier = parkingLot.pricingTiers[vehicleType];
        if (!priceTier) throw new Error(`Bãi xe không hỗ trợ loại xe ${vehicleType}.`);
        const basePricePerHour = priceTier.basePricePerHour;
        const hours = Math.ceil(Math.abs(end - start) / 36e5); // 36e5 = 1 giờ
        const totalPrice = hours * basePricePerHour; // (Giá tạm thời)
        
        // Bước 4: Tạo lượt đặt chỗ (Booking)
        const booking = new Booking({
            user: req.user._id,
            parkingLot: parkingLotId,
            slot: slotId, // Lưu lại ID của ô đã đặt
            slotIdentifier: slot.identifier, // Lưu lại tên ô (A-01) để hiển thị
            startTime,
            endTime,
            totalPrice,
            vehicleNumber,
            vehicleType,
            status: 'confirmed' // Mặc định là 'confirmed' khi đặt thành công
        });
        const createdBooking = await booking.save({ session });

        // Bước 5: Cập nhật trạng thái Ô (quan trọng nhất)
        slot.status = 'reserved'; // Chuyển từ 'available' -> 'reserved'
        slot.currentBooking = createdBooking._id; // Liên kết ô với booking
        
        // Lưu lại thay đổi của toàn bộ bãi xe
        await parkingLot.save({ session });

        // Bước 6: Commit Transaction (Hoàn tất giao dịch)
        await session.commitTransaction();

        // Bước 7: Thông báo Real-time (Đẳng cấp)
        // Gửi thông báo chi tiết về Ô đã thay đổi, thay vì cả bãi xe
        const io = req.app.get('socketio');
        io.emit('slotUpdate', {
            parkingLotId: parkingLot._id.toString(),
            _id: slot._id.toString(),
            status: slot.status,
            identifier: slot.identifier
        });

        res.status(201).json(createdBooking);

    } catch (error) {
        // Nếu có lỗi, hủy bỏ tất cả thay đổi
        await session.abortTransaction();
        console.error('Lỗi khi tạo booking (Transaction Rolled Back):', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Lấy lịch sử đặt chỗ của người dùng đang đăng nhập
 * @route   GET /api/bookings/mybookings
 * @access  Private
 */
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            // Populate thông tin bãi xe (chỉ lấy tên, địa chỉ, ảnh)
            .populate('parkingLot', 'name address images') 
            .sort({ startTime: -1 }); // Sắp xếp theo ngày bắt đầu
            
        res.json(bookings);
    } catch (error) {
        console.error('Lỗi khi lấy booking của tôi:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Người dùng tự hủy một lượt đặt chỗ (chưa diễn ra)
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
const cancelMyBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const booking = await Booking.findById(req.params.id).session(session);

        if (!booking) {
            throw new Error('Không tìm thấy lượt đặt chỗ');
        }
        
        // Chỉ chủ sở hữu mới được hủy
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Không được phép thực hiện thao tác này' });
        }
        
        // Chỉ hủy được các booking 'confirmed' (sắp diễn ra)
        if (booking.status !== 'confirmed') {
            throw new Error('Không thể hủy lượt đặt chỗ đã/đang diễn ra hoặc đã hủy.');
        }

        // (Logic nghiệp vụ "Bùng nổ")
        // Kiểm tra xem có quá sát giờ check-in không (ví dụ: cấm hủy trước 1 giờ)
        const now = new Date();
        const startTime = new Date(booking.startTime);
        const hoursBefore = (startTime.getTime() - now.getTime()) / 36e5;
        
        if (hoursBefore < 1) { // Nếu thời gian bắt đầu còn ít hơn 1 giờ
            throw new Error('Không thể hủy đặt chỗ 1 giờ trước thời gian bắt đầu.');
        }

        // Bước 1: Cập nhật Booking
        booking.status = 'cancelled';
        await booking.save({ session });

        // Bước 2: Tìm bãi xe và ô đỗ
        const parkingLot = await ParkingLot.findById(booking.parkingLot).session(session);
        if (!parkingLot) {
            // Trường hợp hy hữu: bãi xe đã bị xóa
            await session.commitTransaction();
            return res.json({ message: 'Đã hủy đặt chỗ, nhưng không tìm thấy bãi xe gốc.' });
        }

        const slot = parkingLot.slots.id(booking.slot);
        if (!slot) {
             // Trường hợp hy hữu: ô đỗ đã bị xóa
            await session.commitTransaction();
            return res.json({ message: 'Đã hủy đặt chỗ, nhưng không tìm thấy ô đỗ gốc.' });
        }
        
        // Bước 3: Giải phóng Ô (quan trọng)
        // Chỉ giải phóng nếu ô đó vẫn đang được giữ bởi booking này
        if (slot.currentBooking && slot.currentBooking.toString() === booking._id.toString()) {
            slot.status = 'available';
            slot.currentBooking = null;
            await parkingLot.save({ session });
        }
        
        // Bước 4: Commit
        await session.commitTransaction();
        
        // Bước 5: Thông báo Real-time
        const io = req.app.get('socketio');
        io.emit('slotUpdate', {
            parkingLotId: parkingLot._id.toString(),
            _id: slot._id.toString(),
            status: slot.status,
            identifier: slot.identifier
        });
        
        res.json({ message: 'Đã hủy đặt chỗ thành công' });
        
    } catch (error) {
        await session.abortTransaction();
        console.error('Lỗi khi hủy booking:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Lấy tất cả các lượt đặt chỗ trong hệ thống (Admin)
 * @route   GET /api/bookings
 * @access  Private/Admin
 */
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('user', 'name email phone') // Lấy nhiều thông tin hơn
            .populate('parkingLot', 'name address')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Lỗi khi lấy tất cả booking:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * @desc    Admin cập nhật TRẠNG THÁI của một lượt đặt chỗ
 * @route   PUT /api/bookings/:id/status
 * @access  Private/Admin
 * @note    Đây là logic nghiệp vụ phức tạp nhất, xử lý check-in, check-out.
 */
const updateBookingStatusByAdmin = async (req, res) => {
    const { status } = req.body; // status mới: 'active', 'completed', 'cancelled'
    
    if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái cập nhật không hợp lệ.' });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const booking = await Booking.findById(req.params.id).session(session);
        if (!booking) throw new Error('Không tìm thấy lượt đặt chỗ');

        const parkingLot = await ParkingLot.findById(booking.parkingLot).session(session);
        if (!parkingLot) throw new Error('Không tìm thấy bãi xe liên quan');

        const slot = parkingLot.slots.id(booking.slot);
        if (!slot) throw new Error('Không tìm thấy ô đỗ liên quan');

        const oldStatus = booking.status;
        
        // --- PHÂN TÍCH LOGIC NGHIỆP VỤ ---
        
        // 1. Admin/IoT CHECK-IN (Chuyển sang 'active')
        if (newStatus === 'active' && (oldStatus === 'confirmed' || oldStatus === 'pending')) {
            booking.status = 'active';
            slot.status = 'occupied'; // Ô chính thức bị chiếm
            slot.currentBooking = booking._id;
            
            // (Bùng nổ) Cập nhật lại thời gian bắt đầu theo THỜI GIAN THỰC
            booking.startTime = new Date(); 
        }
        
        // 2. Admin/IoT CHECK-OUT (Chuyển sang 'completed')
        else if (newStatus === 'completed' && oldStatus === 'active') {
            booking.status = 'completed';
            slot.status = 'available'; // Giải phóng ô
            slot.currentBooking = null;

            // (Bùng nổ) Tính lại tiền theo THỜI GIAN THỰC
            booking.endTime = new Date(); 
            const priceTier = parkingLot.pricingTiers[booking.vehicleType];
            const basePricePerHour = priceTier.basePricePerHour;
            const hours = Math.ceil(Math.abs(booking.endTime - booking.startTime) / 36e5);
            booking.totalPrice = hours * basePricePerHour; // Tính lại giá cuối cùng
        }
        
        // 3. Admin HỦY (Chuyển sang 'cancelled')
        else if (newStatus === 'cancelled' && (oldStatus === 'confirmed' || oldStatus === 'active')) {
            booking.status = 'cancelled';
            
            // Chỉ giải phóng slot nếu nó đang bị giữ bởi booking này
            if (slot.currentBooking && slot.currentBooking.toString() === booking._id.toString()) {
                slot.status = 'available';
                slot.currentBooking = null;
            }
        }
        
        // Trường hợp khác (ví dụ: đã completed/cancelled)
        else {
            throw new Error(`Không thể chuyển trạng thái từ ${oldStatus} sang ${newStatus}`);
        }

        await booking.save({ session });
        await parkingLot.save({ session });
        await session.commitTransaction();

        // Thông báo Real-time cho mọi người
        const io = req.app.get('socketio');
        io.emit('slotUpdate', {
            parkingLotId: parkingLot._id.toString(),
            _id: slot._id.toString(),
            status: slot.status,
            identifier: slot.identifier
        });
        
        // Gửi thông báo cho user (nếu cần)
        // io.to(booking.user.toString()).emit('bookingUpdated', booking);
        
        res.json(booking);

    } catch (error) {
        await session.abortTransaction();
        console.error('Lỗi khi Admin cập nhật trạng thái booking:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession();
    }
};


module.exports = {
    createBooking,
    getMyBookings,
    cancelMyBooking,
    getAllBookings,
    updateBookingStatusByAdmin
};