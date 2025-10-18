

// --- PHẦN 1: IMPORT CÁC MODULE CƠ BẢN CỦA NODE.JS VÀ CÁC THƯ VIỆN BÊN THỨ BA ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// --- PHẦN 2: IMPORT CÁC MODULE "NỘI BỘ" DO CHÚNG TA TỰ XÂY DỰNG ---
// Kết nối Database
const connectDB = require('./config/db.js');

// Các "Bản đồ" API (Routes)

const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const parkingLotRoutes = require('./routes/parkingLotRoutes.js');
const bookingRoutes = require('./routes/bookingRoutes.js');
const reviewRoutes = require('./routes/reviewRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js'); // Route cho thanh toán
const productRoutes = require('./routes/productRoutes.js'); // Route cho sản phẩm

// Các "Khuôn đúc" Dữ liệu (Models) cần cho Cron Job
const Booking = require('./models/Booking.js');
const ParkingLot = require('./models/ParkingLot.js');

// --- PHẦN 3: CẤU HÌNH BAN ĐẦU CHO ỨNG DỤNG ---
dotenv.config(); // Tải các biến môi trường từ file .env
connectDB(); // Thực hiện kết nối đến MongoDB Atlas

// --- PHẦN 4: KHỞI TẠO CÁC SERVER (EXPRESS, HTTP, SOCKET.IO) ---
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

// Quan trọng: Gán instance `io` vào đối tượng app để các controller có thể truy cập
// và gửi tín hiệu real-time đến người dùng.
app.set('socketio', io);

// --- PHẦN 5: CẤU HÌNH CÁC MIDDLEWARE CHO EXPRESS ---
app.use(cors()); // Cho phép mọi nguồn trong quá trình phát triển
app.use(express.json()); // Cho phép server đọc dữ liệu JSON từ request body

// --- PHẦN 6: GẮN KẾT CÁC ROUTES API VÀO CÁC ĐƯỜNG DẪN GỐC ---
// Mỗi bộ chức năng sẽ có một đường dẫn API gốc riêng biệt, rất khoa học và dễ quản lý.
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parking-lots', parkingLotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products', productRoutes);
// --- PHẦN 7: PHỤC VỤ GIAO DIỆN FRONT-END (STATIC FILES) ---
// Dòng code này biến server back-end thành một web server hoàn chỉnh,
// có khả năng phục vụ các file HTML, CSS, JS tĩnh.
app.use(express.static(path.join(__dirname)));

// Cấu hình "catch-all": Bất kỳ request nào không khớp với các API ở trên
// sẽ được trả về file `index.html`, cho phép Front-end tự quản lý routing.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// --- PHẦN 8: LOGIC REAL-TIME VÀ TỰ ĐỘNG HÓA ---
// 8.1. Lắng nghe các kết nối real-time từ Client
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Một người dùng đã kết nối: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Người dùng đã ngắt kết nối: ${socket.id}`);
    });
});

// 8.2. Hệ thống tự động dọn dẹp các booking hết hạn (Cron Job)
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