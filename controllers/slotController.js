// controllers/slotController.js (PHIÊN BẢN ĐẲNG CẤP - HOÀN TOÀN MỚI)
// Dành cho Admin và Hệ thống Tự động (IoT/Camera AI) quản lý TỪNG Ô.

const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

/**
 * @desc    (IoT/Admin) Cập nhật trạng thái của MỘT Ô (Check-in/Check-out thủ công)
 * @route   PUT /api/slots/:slotId/status
 * @access  Private/Admin (Hoặc API Key cho IoT)
 * @note    Đây là API "Bùng nổ" nhất, là cầu nối với AI/IoT.
 */
const updateSlotStatus = async (req, res) => {
    const { slotId } = req.params;
    const { status, parkingLotId } = req.body; // status mới: 'occupied', 'available', 'maintenance'

    if (!status || !parkingLotId) {
        return res.status(400).json({ message: 'Cần cung cấp status mới và parkingLotId' });
    }
    
    // Dùng Transaction để đảm bảo an toàn
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const parkingLot = await ParkingLot.findById(parkingLotId).session(session);
        if (!parkingLot) throw new Error('Không tìm thấy bãi xe');

        const slot = parkingLot.slots.id(slotId);
        if (!slot) throw new Error('Không tìm thấy ô đỗ');

        const oldStatus = slot.status;
        let bookingToUpdate = null;

        // --- LOGIC NGHIỆP VỤ CỦA IoT/AI ---

        // 1. Xe VÀO Ô (IoT phát hiện 'occupied')
        if (status === 'occupied' && oldStatus === 'available') {
            slot.status = 'occupied';
            // TODO: (AI "Đẳng cấp")
            // Thử tìm xem có booking nào "confirmed" cho ô này không
            // Nếu có, tự động check-in (chuyển booking sang 'active')
            // Nếu không, tạo một booking "vãng lai" (walk-in)
        }
        
        // 2. Xe RỜI Ô (IoT phát hiện 'available')
        else if (status === 'available' && oldStatus === 'occupied') {
            slot.status = 'available';
            
            // Tìm booking 'active' đang liên kết với ô này
            if (slot.currentBooking) {
                bookingToUpdate = await Booking.findById(slot.currentBooking).session(session);
                if (bookingToUpdate && bookingToUpdate.status === 'active') {
                    // Tự động CHECK-OUT và tính tiền
                    bookingToUpdate.status = 'completed';
                    bookingToUpdate.endTime = new Date();
                    
                    // Tính lại tiền
                    const priceTier = parkingLot.pricingTiers[bookingToUpdate.vehicleType];
                    const basePricePerHour = priceTier.basePricePerHour;
                    const hours = Math.ceil(Math.abs(bookingToUpdate.endTime - bookingToUpdate.startTime) / 36e5);
                    bookingToUpdate.totalPrice = hours * basePricePerHour;
                    
                    await bookingToUpdate.save({ session });
                }
            }
            slot.currentBooking = null; // Giải phóng ô
        }
        
        // 3. Admin Bật/Tắt BẢO TRÌ
        else if (status === 'maintenance' && oldStatus !== 'occupied') {
            slot.status = 'maintenance';
            slot.currentBooking = null; // Hủy mọi booking (nếu có)
        }
        
        // 4. Admin Mở lại ô từ 'maintenance'
        else if (status === 'available' && oldStatus === 'maintenance') {
            slot.status = 'available';
        }
        
        // Các trường hợp khác
        else if (status !== oldStatus) {
             slot.status = status;
        }

        await parkingLot.save({ session });
        await session.commitTransaction();

        // Thông báo Real-time
        const io = req.app.get('socketio');
        io.emit('slotUpdate', {
            parkingLotId: parkingLot._id.toString(),
            _id: slot._id.toString(),
            status: slot.status,
            identifier: slot.identifier
        });

        res.json({
            message: `Đã cập nhật ô ${slot.identifier} sang trạng thái ${slot.status}`,
            slot,
            updatedBooking: bookingToUpdate
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Lỗi khi cập nhật trạng thái slot:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    (Admin) Thêm một hoặc nhiều ô mới vào bãi xe đã có
 * @route   POST /api/parking-lots/:id/slots
 * @access  Private/Admin
 */
const addSlotsToParkingLot = async (req, res) => {
    try {
        const { slots } = req.body; // slots: [{ identifier: 'C-01', vehicleType: 'suv' }, ...]
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp một mảng các ô (slots) để thêm.' });
        }

        const parkingLot = await ParkingLot.findById(req.params.id);
        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }

        // TODO: Kiểm tra trùng lặp identifier (mã định danh)

        parkingLot.slots.push(...slots);
        const updatedParkingLot = await parkingLot.save();
        
        // Thông báo real-time
        const io = req.app.get('socketio');
        io.emit('parkingLotUpdate', updatedParkingLot); // Cập nhật cả bãi

        res.status(201).json(updatedParkingLot);

    } catch (error) {
        console.error('Lỗi khi thêm slots:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    (Admin) Xóa một ô khỏi bãi xe
 * @route   DELETE /api/slots/:slotId
 * @access  Private/Admin
 */
const deleteSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const { parkingLotId } = req.body; // Cần biết bãi cha

        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) return res.status(404).json({ message: 'Không tìm thấy bãi xe' });

        const slot = parkingLot.slots.id(slotId);
        if (!slot) return res.status(404).json({ message: 'Không tìm thấy ô đỗ' });

        if (slot.status === 'occupied' || slot.status === 'reserved') {
            return res.status(400).json({ message: 'Không thể xóa ô đang được sử dụng hoặc đã đặt.' });
        }

        slot.deleteOne(); // Xóa sub-document
        const updatedParkingLot = await parkingLot.save();

        // Thông báo real-time
        const io = req.app.get('socketio');
        io.emit('parkingLotUpdate', updatedParkingLot);

        res.json({ message: 'Đã xóa ô thành công' });

    } catch (error) {
        console.error('Lỗi khi xóa slot:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};


module.exports = {
    updateSlotStatus,
    addSlotsToParkingLot,
    deleteSlot
};