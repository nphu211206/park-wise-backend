// controllers/parkingLotController.js (PHIÊN BẢN ĐẲNG CẤP - SLOT-BASED)
// Quản lý thông tin tổng quan của các bãi xe.

const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking'); // Cần để lấy lịch sử

/**
 * @desc    Tạo một bãi xe mới (cho Admin/Owner)
 * @route   POST /api/parking-lots
 * @access  Private/Admin
 * @note    Đây là phiên bản "đẳng cấp", cho phép admin định nghĩa từng slot ngay khi tạo.
 */
const createParkingLot = async (req, res) => {
    try {
        const {
            name,
            address,
            location, // { coordinates: [lng, lat] }
            images,
            description,
            amenities,
            openingHours,
            pricingTiers,
            slots // Mảng các slots [{ identifier: 'A-01', vehicleType: 'car_4_seats' }, ...]
        } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!name || !address || !location || !pricingTiers || !slots) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc: tên, địa chỉ, vị trí, giá và sơ đồ các ô đỗ.' });
        }
        
        // TODO: Trong tương lai, gán owner là req.user._id khi triển khai SaaS
        
        const parkingLot = new ParkingLot({
            name,
            address,
            location,
            images,
            description,
            amenities,
            openingHours,
            pricingTiers,
            slots,
            // owner: req.user._id 
        });

        const createdParkingLot = await parkingLot.save();
        
        // Thông báo real-time cho mọi user (admin) rằng có bãi xe MỚI
        const io = req.app.get('socketio');
        io.emit('newParkingLot', createdParkingLot); // Một sự kiện socket mới

        res.status(201).json(createdParkingLot);

    } catch (error) {
        console.error("Lỗi khi tạo bãi xe:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Lấy danh sách TẤT CẢ bãi xe (Hỗ trợ tìm kiếm Geo, Full-text, Lọc)
 * @route   GET /api/parking-lots
 * @access  Public (hoặc Private, tùy theo logic của bạn)
 * @note    Đây là API tìm kiếm "bùng nổ" và toàn diện nhất.
 */
const getParkingLots = async (req, res) => {
    const { keyword, lat, lng, radius, minRating, maxPrice, amenities } = req.query;
    
    try {
        let query = {};

        // 1. Tìm kiếm theo Vị trí (GeoSearch) - Tính năng "Tìm gần tôi"
        if (lat && lng) {
            const searchRadius = parseFloat(radius) || 10; // Mặc định bán kính 10km
            query.location = {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: searchRadius * 1000 // Chuyển km sang mét
                }
            };
        }

        // 2. Tìm kiếm theo Từ khóa (Full-text Search)
        if (keyword) {
            query.$text = { $search: keyword };
        }

        // 3. Lọc theo Đánh giá
        if (minRating) {
            query.rating = { $gte: parseFloat(minRating) };
        }

        // 4. Lọc theo Giá (Tìm các bãi có ít nhất 1 loại giá dưới maxPrice)
        if (maxPrice) {
            const maxPriceNum = parseFloat(maxPrice);
            // Lọc này phức tạp, tìm bất kỳ `basePricePerHour` nào
            // trong `pricingTiers` mà nhỏ hơn hoặc bằng maxPrice
            query.$or = [
                { 'pricingTiers.motorbike.basePricePerHour': { $lte: maxPriceNum } },
                { 'pricingTiers.car_4_seats.basePricePerHour': { $lte: maxPriceNum } },
                { 'pricingTiers.suv.basePricePerHour': { $lte: maxPriceNum } },
            ];
        }

        // 5. Lọc theo Tiện ích (Phải có TẤT CẢ các tiện ích được yêu cầu)
        if (amenities) {
            const amenitiesList = amenities.split(','); // Gửi qua query dạng "cctv,ev_charging"
            query.amenities = { $all: amenitiesList };
        }

        const parkingLots = await ParkingLot.find(query)
            .select('-slots') // Quan trọng: Không tải 1000 slots ở trang danh sách
            .limit(50); // Giới hạn kết quả để tối ưu
        
        // TODO: Tích hợp AI Định giá Động ở đây
        // const lotsWithDynamicPrice = await Promise.all(
        //     parkingLots.map(lot => calculateDynamicPrice(lot))
        // );
        
        res.json(parkingLots);

    } catch (error) {
        console.error("Lỗi khi lấy danh sách bãi xe:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Lấy thông tin CHI TIẾT của MỘT bãi xe (bao gồm TẤT CẢ các slots)
 * @route   GET /api/parking-lots/:id
 * @access  Private
 * @note    Đây là API quan trọng cho trang chi tiết và `ParkingLotVisualizer`.
 */
const getParkingLotById = async (req, res) => {
    try {
        const parkingLot = await ParkingLot.findById(req.params.id);

        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }
        
        // TODO: Tích hợp AI Định giá Động
        // const lotWithDynamicPrice = await calculateDynamicPrice(parkingLot.toObject());
        
        // Trả về toàn bộ thông tin bãi xe, bao gồm cả mảng `slots`
        res.json(parkingLot); 

    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết bãi xe ${req.params.id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    (Bùng nổ) Lấy lịch sử và dự báo tình trạng bãi xe (Cho biểu đồ)
 * @route   GET /api/parking-lots/:id/statistics
 * @access  Private
 */
const getParkingLotStatistics = async (req, res) => {
    try {
        const lotId = req.params.id;
        
        // 1. Lấy lịch sử đặt chỗ đã hoàn thành trong 7 ngày qua
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentBookings = await Booking.find({
            parkingLot: lotId,
            status: 'completed',
            createdAt: { $gte: sevenDaysAgo }
        }).select('startTime endTime totalPrice');

        // 2. (AI Feature) Phân tích giờ cao điểm
        // Đếm số lượt booking theo giờ trong ngày
        const hourlyUsage = Array(24).fill(0);
        recentBookings.forEach(booking => {
            const startHour = new Date(booking.startTime).getHours();
            const endHour = new Date(booking.endTime).getHours();
            for (let h = startHour; h <= endHour; h++) {
                hourlyUsage[h]++;
            }
        });

        // 3. (AI Feature) Dự báo tình trạng (Logic giả lập đơn giản)
        // Dựa trên các booking "confirmed" trong tương lai
        const upcomingBookings = await Booking.find({
            parkingLot: lotId,
            status: { $in: ['confirmed', 'active'] },
            startTime: { $gte: new Date() }
        }).countDocuments();

        const parkingLot = await ParkingLot.findById(lotId).select('totalSpots');
        const availableNow = (await ParkingLot.findById(lotId)).availableSpots; // Lấy virtual

        const totalSpots = parkingLot.totalSpots;
        const occupancyNow = ((totalSpots - availableNow) / totalSpots) * 100;
        
        res.json({
            occupancyNow: parseFloat(occupancyNow.toFixed(1)),
            availableNow,
            totalSpots,
            upcomingBookings,
            hourlyUsageStatistics: hourlyUsage, // Dữ liệu cho biểu đồ "Giờ cao điểm"
            recentRevenue: recentBookings.reduce((acc, b) => acc + b.totalPrice, 0)
        });

    } catch (error) {
        console.error(`Lỗi khi lấy thống kê bãi xe ${req.params.id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// --- Các hàm CRUD khác (Update, Delete) ---

/**
 * @desc    Cập nhật thông tin cơ bản của bãi xe (Admin/Owner)
 * @route   PUT /api/parking-lots/:id
 * @access  Private/Admin
 */
const updateParkingLot = async (req, res) => {
    try {
        const { name, address, images, description, amenities, openingHours, pricingTiers, status } = req.body;
        
        const parkingLot = await ParkingLot.findById(req.params.id);

        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }
        
        // (Kiểm tra quyền sở hữu cho SaaS)
        // if (parkingLot.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        //     return res.status(401).json({ message: 'Không có quyền' });
        // }

        parkingLot.name = name || parkingLot.name;
        parkingLot.address = address || parkingLot.address;
        parkingLot.images = images || parkingLot.images;
        parkingLot.description = description || parkingLot.description;
        parkingLot.amenities = amenities || parkingLot.amenities;
        parkingLot.openingHours = openingHours || parkingLot.openingHours;
        parkingLot.pricingTiers = pricingTiers || parkingLot.pricingTiers;
        parkingLot.status = status || parkingLot.status;

        const updatedParkingLot = await parkingLot.save();
        
        // Thông báo cho các user đang xem bãi này
        const io = req.app.get('socketio');
        io.emit('parkingLotUpdate', updatedParkingLot); // Sự kiện socket cũ

        res.json(updatedParkingLot);

    } catch (error) {
        console.error(`Lỗi khi cập nhật bãi xe ${req.params.id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Xóa bãi xe (Admin/Owner)
 * @route   DELETE /api/parking-lots/:id
 * @access  Private/Admin
 */
const deleteParkingLot = async (req, res) => {
    try {
        const parkingLot = await ParkingLot.findById(req.params.id);

        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }

        // (Kiểm tra quyền)
        // ...

        // TODO: Thêm logic kiểm tra xem bãi xe có đang có booking active không
        const activeBookings = await Booking.findOne({ 
            parkingLot: req.params.id, 
            status: { $in: ['active', 'confirmed'] } 
        });

        if (activeBookings) {
            return res.status(400).json({ message: 'Không thể xóa bãi xe đang có lượt đặt chỗ active/confirmed.' });
        }

        await parkingLot.deleteOne();
        
        // Xóa tất cả review liên quan (nếu cần)
        // await Review.deleteMany({ parkingLot: req.params.id });
        
        // Thông báo real-time
        const io = req.app.get('socketio');
        io.emit('parkingLotDeleted', { id: req.params.id });

        res.json({ message: 'Đã xóa bãi xe thành công' });

    } catch (error) {
        console.error(`Lỗi khi xóa bãi xe ${req.params.id}:`, error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};


module.exports = {
    createParkingLot,
    getParkingLots,
    getParkingLotById,
    getParkingLotStatistics,
    updateParkingLot,
    deleteParkingLot
};