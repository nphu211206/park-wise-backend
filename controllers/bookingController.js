const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const { calculateDynamicPrice } = require('../utils/priceCalculator');

/**
 * @desc    Tạo một lượt đặt chỗ mới.
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
    const { parkingLotId, startTime, endTime, vehicleNumber } = req.body;
    if (!parkingLotId || !startTime || !endTime) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin' });
    }
    try {
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) return res.status(404).json({ message: 'Không tìm thấy bãi xe.' });
        if (parkingLot.availableSpots <= 0) return res.status(400).json({ message: 'Bãi xe đã hết chỗ trống.' });

        const dynamicPrice = calculateDynamicPrice(parkingLot);
        const start = new Date(startTime), end = new Date(endTime);
        if(end <= start) return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
        
        const hours = Math.ceil(Math.abs(end - start) / 36e5);
        const totalPrice = hours * dynamicPrice;

        const booking = new Booking({
            user: req.user._id, parkingLot: parkingLotId, startTime, endTime, totalPrice, vehicleNumber
        });
        const createdBooking = await booking.save();

        parkingLot.availableSpots -= 1;
        const updatedParkingLot = await parkingLot.save();

        const io = req.app.get('socketio');
        if (io) io.emit('parkingLotUpdate', updatedParkingLot);
        
        res.status(201).json(createdBooking);
    } catch (error) {
        console.error('Lỗi khi tạo booking:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Lấy lịch sử đặt chỗ của người dùng đang đăng nhập.
 * @route   GET /api/bookings/mybookings
 * @access  Private
 */
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('parkingLot', 'name address')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Lỗi khi lấy booking của tôi:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Lấy tất cả các lượt đặt chỗ trong hệ thống.
 * @route   GET /api/bookings
 * @access  Private/Admin
 */
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('user', 'name')
            .populate('parkingLot', 'name')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Lỗi khi lấy tất cả booking:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * @desc    Người dùng tự hủy một lượt đặt chỗ của mình.
 * @route   DELETE /api/bookings/:id/cancel
 * @access  Private
 */
const cancelMyBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Không tìm thấy lượt đặt chỗ' });
        if (booking.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Không được phép thực hiện thao tác này' });
        if (['completed', 'active', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Không thể hủy lượt đặt chỗ đã/đang diễn ra hoặc đã hủy' });

        booking.status = 'cancelled';
        await booking.save();
        
        const parkingLot = await ParkingLot.findById(booking.parkingLot);
        if (parkingLot) {
            parkingLot.availableSpots += 1;
            const updatedParkingLot = await parkingLot.save();
            const io = req.app.get('socketio');
            if (io) io.emit('parkingLotUpdate', updatedParkingLot);
        }
        
        res.json({ message: 'Đã hủy đặt chỗ thành công' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

/**
 * @desc    Admin cập nhật trạng thái của một lượt đặt chỗ.
 * @route   PUT /api/bookings/:id/status
 * @access  Private/Admin
 */
const updateBookingStatusByAdmin = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Không tìm thấy lượt đặt chỗ' });

        const oldStatus = booking.status;
        const newStatus = req.body.status;
        if (!['pending', 'confirmed', 'active', 'completed', 'cancelled'].includes(newStatus)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
        }
        booking.status = newStatus;
        await booking.save();

        if ((oldStatus === 'active' || oldStatus === 'confirmed') && (newStatus === 'cancelled' || newStatus === 'completed')) {
            const parkingLot = await ParkingLot.findById(booking.parkingLot);
            if (parkingLot) {
                parkingLot.availableSpots += 1;
                const updatedParkingLot = await parkingLot.save();
                const io = req.app.get('socketio');
                if (io) io.emit('parkingLotUpdate', updatedParkingLot);
            }
        }
        
        res.json(booking);
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

module.exports = { createBooking, getMyBookings, getAllBookings, cancelMyBooking, updateBookingStatusByAdmin };