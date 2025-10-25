const jwt = require('jsonwebtoken');
const User = require('../models/User.js'); // Đảm bảo User model được import

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // --- THAY ĐỔI Ở ĐÂY ---
            // Tìm user bằng id VÀ populate thêm trường 'vehicles'
            // Loại bỏ password
            req.user = await User.findById(decoded.id).select('-password').populate('vehicles');
            // --- KẾT THÚC THAY ĐỔI ---

            if (!req.user) {
                 // Nếu token hợp lệ nhưng không tìm thấy user (vd: user bị xóa)
                 console.warn(`Authentication failed: User ${decoded.id} not found.`);
                 return res.status(401).json({ message: 'Xác thực thất bại, người dùng không tồn tại.' });
            }

            next(); // Cho phép request đi tiếp

        } catch (error) {
            console.error('Token verification failed:', error);
             let message = 'Xác thực thất bại, token không hợp lệ.';
             if (error.name === 'TokenExpiredError') {
                 message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
             }
             // Trả về lỗi 401 Unauthorized
            return res.status(401).json({ message });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Xác thực thất bại, không tìm thấy token.' });
    }
};
const admin = (req, res, next) => {
    // req.user tồn tại và req.user.role là 'admin'
    if (req.user && req.user.role === 'admin') {
        // Nếu đúng là admin, cho phép đi tiếp.
        next();
    } else {
        // Nếu không, trả về lỗi 403 Forbidden (Cấm truy cập).
        res.status(403).json({ message: 'Yêu cầu quyền Admin để thực hiện chức năng này' });
    }
};

module.exports = { protect, admin };