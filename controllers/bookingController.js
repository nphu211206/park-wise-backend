

const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const { calculateDynamicPrice } = require('../utils/priceCalculator');

/**
 * @desc    Tạo một đơn hàng và ngay lập tức "thanh toán" (giả lập).
 * @route   POST /api/bookings/create-and-pay
 * @access  Private
 */
const createAndPayBooking = async (req, res) => {
    // Bước 1: Lấy toàn bộ dữ liệu cần thiết từ request body do Front-end gửi lên.
    const { parkingLotId, startTime, endTime, vehicleNumber, fakeCardDetails } = req.body;

    // Bước 2: Xác thực dữ liệu đầu vào. Đây là lớp phòng vệ đầu tiên.
    if (!parkingLotId || !startTime || !endTime || !fakeCardDetails || !fakeCardDetails.cardNumber) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin đặt chỗ và thanh toán.' });
    }

    try {
        // Bước 3: Tìm bãi xe trong database để đảm bảo nó tồn tại và còn chỗ.
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) return res.status(404).json({ message: 'Không tìm thấy bãi xe.' });
        if (parkingLot.availableSpots <= 0) return res.status(400).json({ message: 'Bãi xe đã hết chỗ trống.' });

        // Bước 4: Tính toán chi phí dựa trên thuật toán giá động thông minh.
        const dynamicPrice = calculateDynamicPrice(parkingLot);
        const start = new Date(startTime), end = new Date(endTime);
        if(end <= start) return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
        
        const hours = Math.ceil(Math.abs(end - start) / 36e5);
        const totalPrice = hours * dynamicPrice;

        // Bước 5: Logic "Thanh toán Giả lập" đẳng cấp.
        if (fakeCardDetails.cardNumber.toString().startsWith('4') || fakeCardDetails.cardNumber.toString().startsWith('5')) {
            console.log(`[Payment Simulation] Thẻ ${fakeCardDetails.cardNumber} hợp lệ. Thanh toán giả lập thành công.`);
        } else {
            return res.status(400).json({ message: 'Thanh toán thất bại. Vui lòng dùng thẻ giả lập hợp lệ (bắt đầu bằng 4 hoặc 5).' });
        }
        
        // Bước 6: Nếu thanh toán giả lập thành công, tạo và lưu đơn đặt chỗ với trạng thái cuối cùng.
        const booking = new Booking({
            user: req.user._id,
            parkingLot: parkingLotId,
            startTime, endTime, totalPrice, vehicleNumber,
            status: 'confirmed', // Trạng thái đã xác nhận
            isPaid: true,        // Đánh dấu đã thanh toán
            paidAt: new Date(),
            paymentResult: { id: `fake_${Date.now()}`, status: 'COMPLETED', email_address: req.user.email }
        });
        const createdBooking = await booking.save();

        // Bước 7: Cập nhật bãi xe và gửi tín hiệu Real-time.
        parkingLot.availableSpots -= 1;
        const updatedParkingLot = await parkingLot.save();

        const io = req.app.get('socketio');
        if (io) io.emit('parkingLotUpdate', updatedParkingLot);
        
        // Bước 8: Trả về kết quả thành công cho Front-end.
        res.status(201).json(createdBooking);

    } catch (error) {
        console.error('Lỗi khi tạo và thanh toán booking:', error);
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
        if (!booking) return res.status(404).json({ message: 'Không tìm thấy lượt đặt chỗ.' });

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Không được phép thực hiện thao tác này.' });
        }

        if (['completed', 'active', 'cancelled'].includes(booking.status)) {
            return res.status(400).json({ message: 'Không thể hủy lượt đặt chỗ đã/đang diễn ra hoặc đã bị hủy.' });
        }
        
        const oldStatus = booking.status;
        booking.status = 'cancelled';
        await booking.save();
        
        // Chỉ trả lại chỗ trống nếu đơn hàng trước đó đã được xác nhận và chiếm chỗ
        if (oldStatus === 'confirmed' || oldStatus === 'active') {
             const parkingLot = await ParkingLot.findById(booking.parkingLot);
            if (parkingLot) {
                parkingLot.availableSpots += 1;
                const updatedParkingLot = await parkingLot.save();
                const io = req.app.get('socketio');
                if (io) io.emit('parkingLotUpdate', updatedParkingLot);
            }
        }
        
        res.json({ message: 'Đã hủy đặt chỗ thành công.' });
    } catch (error) { 
        console.error("Lỗi khi hủy booking:", error);
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};

/**
 * @desc    Admin cập nhật trạng thái của một lượt đặt chỗ.
 * @route   PUT /api/bookings/:id/status
 * @access  Private/Admin
 */
const updateBookingStatusByAdmin = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Không tìm thấy lượt đặt chỗ.' });

        const oldStatus = booking.status;
        const newStatus = req.body.status;
        
        if (!['pending', 'confirmed', 'active', 'completed', 'cancelled'].includes(newStatus)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        booking.status = newStatus;
        await booking.save();

        // Logic trả lại chỗ trống nếu Admin hủy hoặc hoàn thành một đơn đã chiếm chỗ
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
    } catch (error) { 
        console.error("Lỗi khi admin cập nhật status:", error);
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};


module.exports = {
    createAndPayBooking, // Hàm mới thay thế cho createBooking
    getMyBookings,
    getAllBookings,
    cancelMyBooking,
    updateBookingStatusByAdmin
};