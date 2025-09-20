// File: controllers/parkingLotController.js (Phiên bản Gỡ lỗi Siêu đơn giản)

const ParkingLot = require('../models/ParkingLot');
// Không cần hàm tính giá ở đây nữa để giảm thiểu lỗi
// const { calculateDynamicPrice } = require('../utils/priceCalculator'); 

const getParkingLots = async (req, res) => {
    try {
        console.log("--- Bắt đầu lấy danh sách bãi xe (phiên bản gỡ lỗi đơn giản) ---");
        
        // Chỉ thực hiện một lệnh tìm kiếm duy nhất, đơn giản nhất
        const parkingLots = await ParkingLot.find({});
        
        console.log(`--- Đã tìm thấy ${parkingLots.length} bãi xe từ database ---`);
        
        // Trả về kết quả ngay lập tức
        res.json(parkingLots);

    } catch (error) {
        console.error("!!! LỖI NGHIÊM TRỌNG TRONG getParkingLots:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- CÁC HÀM KHÁC VẪN GIỮ NGUYÊN ĐỂ HỆ THỐNG KHÔNG BỊ LỖI ---
const getParkingLotById = async (req, res) => {
    try {
        const parkingLot = await ParkingLot.findById(req.params.id);
        if (parkingLot) {
            res.json(parkingLot.toObject());
        } else {
            res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }
    } catch (error) { res.status(500).json({ message: 'Lỗi server', error: error.message }); }
};

const createParkingLot = async (req, res) => {
    try {
        const { name, address, coordinates, totalSpots, basePrice, facilities } = req.body;
        const parkingLot = new ParkingLot({ name, address, location: { coordinates }, totalSpots, availableSpots: totalSpots, basePrice, facilities });
        const createdParkingLot = await parkingLot.save();
        res.status(201).json(createdParkingLot);
    } catch (error) { res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message }); }
};

const updateParkingLot = async (req, res) => { /* ... giữ nguyên code cũ ... */ };
const deleteParkingLot = async (req, res) => { /* ... giữ nguyên code cũ ... */ };

module.exports = { getParkingLots, getParkingLotById, createParkingLot, updateParkingLot, deleteParkingLot };