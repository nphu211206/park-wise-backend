// controllers/pricingController.js (PHIÊN BẢN CƠ BẢN - Placeholder cho AI)

const ParkingLot = require('../models/ParkingLot');
const mongoose = require('mongoose');

/**
 * Ước tính giá đỗ xe cơ bản (chưa có AI).
 * @param {Date} start - Thời gian bắt đầu.
 * @param {Date} end - Thời gian kết thúc.
 * @param {number} basePricePerHour - Giá cơ sở mỗi giờ cho loại xe.
 * @returns {number} - Tổng chi phí cơ bản.
 */
const calculateBasePrice = (start, end, basePricePerHour) => {
    if (!start || !end || end <= start || typeof basePricePerHour !== 'number' || basePricePerHour < 0) {
        return 0; // Hoặc ném lỗi nếu cần
    }
    const diffMs = Math.abs(end - start);
    const hours = Math.ceil(diffMs / 3600000); // 36e5 = 1 giờ
    return hours * basePricePerHour;
};

/**
 * @desc    (API Placeholder) Ước tính giá đỗ xe dựa trên thông tin đầu vào.
 * @route   GET /api/pricing/estimate
 * @access  Private (Cần token để biết loại xe mặc định của user nếu cần)
 * @query   parkingLotId, startTime (ISO), endTime (ISO), vehicleType
 */
const estimatePrice = async (req, res) => {
    const { parkingLotId, startTime, endTime, vehicleType } = req.query;

    // --- Validation Đầu vào "Đẳng Cấp" ---
    if (!parkingLotId || !startTime || !endTime || !vehicleType) {
        return res.status(400).json({ message: 'Thiếu thông tin cần thiết: parkingLotId, startTime, endTime, vehicleType.' });
    }
    if (!mongoose.Types.ObjectId.isValid(parkingLotId)) {
        return res.status(400).json({ message: 'ID bãi xe không hợp lệ.' });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ message: 'Thời gian bắt đầu hoặc kết thúc không hợp lệ.' });
    }
    // Kiểm tra vehicleType có hợp lệ không (enum từ ParkingLot model)
    const validVehicleTypes = ParkingLot.schema.path('slots').schema.path('vehicleType').enumValues;
    if (!validVehicleTypes.includes(vehicleType) && vehicleType !== 'any') { // Cho phép 'any' nếu cần
         return res.status(400).json({ message: `Loại xe không hợp lệ: ${vehicleType}. Các loại xe được hỗ trợ: ${validVehicleTypes.join(', ')}` });
    }


    try {
        // Chỉ cần lấy thông tin giá từ ParkingLot
        const parkingLot = await ParkingLot.findById(parkingLotId).select('pricingTiers name').lean();
        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe.' });
        }

        const priceTier = parkingLot.pricingTiers[vehicleType];
        if (!priceTier || typeof priceTier.basePricePerHour !== 'number') {
            // Nếu không có giá cho loại xe này, có thể dùng giá mặc định hoặc báo lỗi
             console.warn(`[estimatePrice] Missing price tier for ${vehicleType} at lot ${parkingLotId}`);
             // Tạm thời trả về giá 0 và thông báo
             // Hoặc có thể lấy giá của 'car_4_seats' làm mặc định? -> Tùy logic kinh doanh
             return res.status(400).json({ message: `Bãi xe "${parkingLot.name}" hiện không hỗ trợ hoặc chưa có giá cho loại xe "${vehicleType}".` });
        }

        const basePricePerHour = priceTier.basePricePerHour;
        const estimatedBasePrice = calculateBasePrice(start, end, basePricePerHour);

        // --- Placeholder cho Logic AI ---
        let finalPrice = estimatedBasePrice;
        let factors = ['base_price']; // Lý do giá (chỉ có giá cơ sở)
        const currentHour = start.getHours();
        const dayOfWeek = start.getDay(); // 0 = Sunday, 6 = Saturday

        // Ví dụ logic AI giả lập đơn giản: Tăng giá 20% vào cuối tuần (T7, CN) hoặc giờ cao điểm (17h-19h)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isPeakHour = currentHour >= 17 && currentHour <= 19;

        if (isWeekend) {
            finalPrice = estimatedBasePrice * 1.2; // Tăng 20%
            factors.push('weekend_surcharge');
            factors = factors.filter(f => f !== 'base_price'); // Bỏ base_price nếu có phụ phí
        } else if (isPeakHour) {
            finalPrice = estimatedBasePrice * 1.15; // Tăng 15%
            factors.push('peak_hour_surcharge');
             factors = factors.filter(f => f !== 'base_price');
        }

        // Làm tròn giá cuối cùng (ví dụ: làm tròn đến nghìn đồng)
        finalPrice = Math.round(finalPrice / 1000) * 1000;

        console.log(`[estimatePrice] Lot: ${parkingLotId}, Vehicle: ${vehicleType}, Time: ${startTime}-${endTime}, Base: ${estimatedBasePrice}, Final: ${finalPrice}, Factors: ${factors.join(', ')}`);

        res.json({
            estimatedPrice: finalPrice, // Giá cuối cùng (đã tính AI giả lập)
            basePrice: estimatedBasePrice, // Giá gốc để tham khảo
            factors: factors, // Lý do ảnh hưởng giá
            currency: 'VND',
            // Thêm các thông tin khác nếu cần (vd: chi tiết phụ phí)
        });

    } catch (error) {
        console.error('[estimatePrice] Error:', error);
        res.status(500).json({ message: 'Lỗi server khi ước tính giá.', error: error.message });
    }
};

module.exports = {
    estimatePrice,
    // Xuất thêm các hàm khác nếu có
};