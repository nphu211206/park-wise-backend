const mongoose = require('mongoose');

/**
 * Hàm bất đồng bộ (async) để kết nối đến cơ sở dữ liệu MongoDB.
 * Sử dụng các biến môi trường từ file .env để bảo mật chuỗi kết nối.
 */
const connectDB = async () => {
    try {
        // Sử dụng mongoose.connect để thiết lập kết nối.
        // process.env.MONGO_URI là chuỗi kết nối được lấy từ file .env.
        // Các options useNewUrlParser và useUnifiedTopology hiện đã lỗi thời
        // nhưng vẫn có thể để lại để tương thích ngược, các phiên bản mới của Mongoose
        // đã tự động xử lý các vấn đề này.
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // useNewUrlParser: true,  // (Deprecated)
            // useUnifiedTopology: true, // (Deprecated)
        });

        // Nếu kết nối thành công, in ra một thông báo xác nhận ra console.
        // conn.connection.host cung cấp thông tin về cluster đã kết nối.
        console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);

    } catch (error) {
        // Nếu có bất kỳ lỗi nào xảy ra trong quá trình kết nối (sai mật khẩu, lỗi mạng, etc.)
        // In ra thông báo lỗi chi tiết.
        console.error(`Error connecting to MongoDB: ${error.message}`);

        // Thoát khỏi tiến trình ứng dụng với mã lỗi 1.
        // Đây là một bước quan trọng để ngăn ứng dụng chạy mà không có kết nối database,
        // tránh các lỗi nghiêm trọng hơn sau này.
        process.exit(1);
    }
};

module.exports = connectDB;