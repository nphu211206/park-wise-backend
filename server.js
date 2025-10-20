const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// --- PHẦN 2: IMPORT CÁC MODULE "NỘI BỘ" CỦA DỰ ÁN ---
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const parkingLotRoutes = require('./routes/parkingLotRoutes.js');
const bookingRoutes = require('./routes/bookingRoutes.js');
const Booking = require('./models/Booking.js');
const ParkingLot = require('./models/ParkingLot.js');

// --- PHẦN 3: CẤU HÌNH BAN ĐẦU ---
dotenv.config();
connectDB();

// --- PHẦN 4: KHỞI TẠO EXPRESS APP, HTTP SERVER VÀ SOCKET.IO ---
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Quan trọng: Truyền instance `io` vào đối tượng app để các controller có thể dùng
app.set('socketio', io);

// --- PHẦN 5: CẤU HÌNH MIDDLEWARE ---
// Cho phép các yêu cầu từ nhiều nguồn khác nhau (quan trọng cho lúc phát triển)
app.use(cors());
// Cho phép server đọc dữ liệu JSON từ request body
app.use(express.json());

// --- PHẦN 6: GẮN KẾT CÁC ROUTES API ---
// Tất cả các request đến /api/* sẽ được xử lý ở đây
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parking-lots', parkingLotRoutes);
app.use('/api/bookings', bookingRoutes);

// --- PHẦN 7: PHỤC VỤ FRONT-END (HTML, CSS, JS tĩnh) ---
// Thiết lập thư mục gốc của dự án làm thư mục tĩnh
app.use(express.static(path.join(__dirname)));

// Cấu hình "catch-all": Bất kỳ request nào không khớp với các API ở trên
// sẽ được trả về file `index.html`. Điều này cho phép Front-end tự quản lý routing.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// --- PHẦN 8: LOGIC REAL-TIME VÀ TỰ ĐỘNG HÓA ---
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Một người dùng đã kết nối: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Người dùng đã ngắt kết nối: ${socket.id}`);
    });
});

cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron Job] Bắt đầu quét các lượt đặt chỗ đã hết hạn...');
    const now = new Date();
    try {
        const expiredBookings = await Booking.find({
            status: { $in: ['active', 'confirmed'] },
            endTime: { $lt: now }
        });

        if (expiredBookings.length > 0) {
            console.log(`[Cron Job] Phát hiện ${expiredBookings.length} lượt đặt chỗ hết hạn.`);
            for (const booking of expiredBookings) {
                booking.status = 'completed';
                await booking.save();
                const parkingLot = await ParkingLot.findById(booking.parkingLot);
                if (parkingLot) {
                    parkingLot.availableSpots += 1;
                    const updatedParkingLot = await parkingLot.save();
                    console.log(`[Cron Job] Đã hoàn thành booking ${booking._id} và trả lại 1 chỗ cho bãi ${parkingLot.name}.`);
                    io.emit('parkingLotUpdate', updatedParkingLot);
                }
            }
        } else {
            console.log('[Cron Job] Không có lượt đặt chỗ nào hết hạn.');
        }
    } catch (error) {
        console.error('[Cron Job] Gặp lỗi khi đang chạy:', error);
    }
});

// --- PHẦN 9: KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, console.log(`Server is running in ULTIMATE mode on port ${PORT}`));
