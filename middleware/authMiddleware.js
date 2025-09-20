const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

/**
 * Middleware `protect`: Xác thực người dùng.
 * Kiểm tra sự tồn tại và tính hợp lệ của JSON Web Token (JWT).
 * Nếu hợp lệ, lấy thông tin người dùng từ database và gắn vào đối tượng request.
 */
const protect = async (req, res, next) => {
    let token;

    // Bước 1: Kiểm tra xem header 'Authorization' có tồn tại và có định dạng 'Bearer [token]' không.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Bước 2: Tách lấy chuỗi token, bỏ đi chữ 'Bearer ' ở đầu.
            token = req.headers.authorization.split(' ')[1];

            // Bước 3: Giải mã token bằng cách sử dụng JWT_SECRET đã lưu trong file .env.
            // Thao tác này sẽ trả về payload đã được mã hóa trước đó (chứa id của người dùng).
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Bước 4: Dùng id từ token đã giải mã để tìm người dùng trong database.
            // .select('-password') là một lệnh quan trọng để loại bỏ trường mật khẩu
            // khỏi đối tượng user, tránh rò rỉ thông tin nhạy cảm.
            req.user = await User.findById(decoded.id).select('-password');

            // Nếu tìm thấy người dùng, cho phép request đi tiếp đến controller xử lý.
            next();

        } catch (error) {
            // Nếu token không hợp lệ (hết hạn, bị sửa đổi...), jwt.verify sẽ báo lỗi.
            console.error('Token verification failed', error);
            return res.status(401).json({ message: 'Xác thực thất bại, token không hợp lệ' });
        }
    }

    // Nếu không tìm thấy token trong header, từ chối truy cập.
    if (!token) {
        res.status(401).json({ message: 'Xác thực thất bại, không tìm thấy token' });
    }
};

/**
 * Middleware `admin`: Phân quyền Quản trị viên.
 * Middleware này PHẢI được dùng SAU middleware `protect`.
 * Nó kiểm tra xem đối tượng `req.user` (do `protect` gắn vào) có vai trò 'admin' hay không.
 */
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