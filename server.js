// server.js (PHIÊN BẢN ĐẲNG CẤP - SLOT-BASED)

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const connectDB = require('./config/db.js');
const mongoose = require('mongoose'); // Cần cho transaction

// --- IMPORT CÁC MODELS NỀN TẢNG ---
const Booking = require('./models/Booking.js');
const ParkingLot = require('./models/ParkingLot.js');
const User = require('./models/User.js');

// --- IMPORT CÁC ROUTES ĐÃ NÂNG CẤP ---
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const parkingLotRoutes = require('./routes/parkingLotRoutes.js');
const bookingRoutes = require('./routes/bookingRoutes.js');
const slotRoutes = require('./routes/slotRoutes.js'); // Route mới

// --- CẤU HÌNH BAN ĐẦU ---
dotenv.config();
connectDB(); // Kết nối MongoDB

// --- KHỞI TẠO APP, HTTP SERVER VÀ SOCKET.IO (ĐẲNG CẤP) ---
const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cho phép tất cả (trong dev)
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Quan trọng: Gắn `io` vào `app` để các controllers có thể truy cập
app.set('socketio', io);

// --- CẤU HÌNH MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Cho phép server đọc JSON body

// --- GẮN KẾT CÁC ROUTES API "ĐẲNG CẤP" ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parking-lots', parkingLotRoutes); // Route đã nâng cấp
app.use('/api/bookings', bookingRoutes);     // Route đã nâng cấp
app.use('/api/slots', slotRoutes);         // Route HOÀN TOÀN MỚI
app.use('/api/reviews', require('./routes/reviewRoutes.js'));
app.use('/api/pricing', require('./routes/pricingRoutes.js'));
// --- PHỤC VỤ FRONT-END (React/Next.js Build) ---
// (Phần này sẽ dùng khi bạn build dự án React/Next.js)
/*
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/build')));
    app.get('*', (req, res) =>
        res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
    );
} else {
    // Trong môi trường dev, chúng ta không cần phục vụ file tĩnh
    app.get('/', (req, res) => {
        res.send('API ĐANG CHẠY... (Chế độ Development)');
    });
}
*/
// Tạm thời giữ code phục vụ file tĩnh cũ của bạn
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});


// --- LOGIC REAL-TIME (SOCKET.IO) "ĐẲNG CẤP" ---
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Người dùng kết nối: ${socket.id}`);

    // (Bùng nổ) Cho phép user "tham gia" vào một "phòng"
    // dựa trên bãi xe họ đang xem, để chỉ nhận thông báo liên quan
    socket.on('joinLotRoom', (lotId) => {
        socket.join(lotId);
        console.log(`[Socket.IO] User ${socket.id} đã tham gia phòng ${lotId}`);
    });

    socket.on('leaveLotRoom', (lotId) => {
        socket.leave(lotId);
        console.log(`[Socket.IO] User ${socket.id} đã rời phòng ${lotId}`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Người dùng ngắt kết nối: ${socket.id}`);
    });
});

// --- LOGIC TỰ ĐỘNG HÓA (CRON JOB) "ĐẲNG CẤP" ---
// Chạy mỗi 1 phút (thay vì 5 phút) để đảm bảo tính chính xác
cron.schedule('* * * * *', async () => {
    console.log('[Cron Job] Bắt đầu quét hệ thống (mỗi phút)...');
    
    const now = new Date();
    
    // Bắt đầu Transaction cho Cron Job
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Tác vụ 1: Tìm các booking 'reserved' đã quá giờ bắt đầu (User không đến)
        const noShowBookings = await Booking.find({
            status: 'reserved',
            startTime: { $lt: now } // Giờ bắt đầu đã ở trong quá khứ
        }).session(session);

        if (noShowBookings.length > 0) {
            console.log(`[Cron Job] Phát hiện ${noShowBookings.length} lượt đặt chỗ "No-Show".`);
            for (const booking of noShowBookings) {
                booking.status = 'cancelled'; // Tự động hủy
                await booking.save({ session });
                
                const parkingLot = await ParkingLot.findById(booking.parkingLot).session(session);
                const slot = parkingLot.slots.id(booking.slot);
                if (slot && slot.currentBooking.toString() === booking._id.toString()) {
                    slot.status = 'available'; // Giải phóng ô
                    slot.currentBooking = null;
                    await parkingLot.save({ session });
                    
                    // Gửi thông báo real-time
                    io.emit('slotUpdate', {
                        parkingLotId: parkingLot._id.toString(),
                        _id: slot._id.toString(),
                        status: slot.status,
                        identifier: slot.identifier
                    });
                }
            }
        }

        // Tác vụ 2: Tìm các booking 'active' đã đến giờ kết thúc
        const expiredBookings = await Booking.find({
            status: 'active',
            endTime: { $lt: now } // Giờ kết thúc đã ở trong quá khứ
        }).session(session);

        if (expiredBookings.length > 0) {
            console.log(`[Cron Job] Phát hiện ${expiredBookings.length} lượt đặt chỗ "Hết hạn".`);
            for (const booking of expiredBookings) {
                booking.status = 'completed'; // Tự động hoàn thành
                // (Bùng nổ) Tự động tính tiền phạt nếu đỗ quá giờ (nếu cần)
                // booking.totalPrice += 50000; // Phí đỗ quá giờ
                await booking.save({ session });
                
                const parkingLot = await ParkingLot.findById(booking.parkingLot).session(session);
                const slot = parkingLot.slots.id(booking.slot);
                if (slot && slot.currentBooking.toString() === booking._id.toString()) {
                    slot.status = 'available'; // Giải phóng ô
                    slot.currentBooking = null;
                    await parkingLot.save({ session });

                    // Gửi thông báo real-time
                    io.emit('slotUpdate', {
                        parkingLotId: parkingLot._id.toString(),
                        _id: slot._id.toString(),
                        status: slot.status,
                        identifier: slot.identifier
                    });
                }
            }
        }
        
        await session.commitTransaction();
        console.log('[Cron Job] Quét hoàn tất.');

    } catch (error) {
        await session.abortTransaction();
        console.error('[Cron Job] Gặp lỗi nghiêm trọng, đã Rollback:', error);
    } finally {
        session.endSession();
    }
});


// --- KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, console.log(
    `✅✅✅ Server "ĐẲNG CẤP" đang chạy ở chế độ ${process.env.NODE_ENV || 'development'} trên cổng ${PORT}`
));