const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Hàm nội bộ: Tạo JSON Web Token (JWT).
 * @param {string} id - ID của người dùng từ MongoDB.
 * @returns {string} - Một chuỗi token đã được ký.
 */
const generateToken = (id) => {
    // jwt.sign() nhận 3 tham số:
    // 1. Payload: Dữ liệu muốn mã hóa vào token (ở đây là id người dùng).
    // 2. Secret Key: Một chuỗi bí mật chỉ server biết, dùng để ký và xác thực token.
    // 3. Options: Các tùy chọn như thời gian hết hạn của token ('30d' = 30 ngày).
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// -----------------------------------------------------------------------------------

/**
 * @desc    Đăng ký một người dùng mới vào hệ thống.
 * @route   POST /api/auth/register
 * @access  Public (Bất kỳ ai cũng có thể truy cập)
 */
const registerUser = async (req, res) => {
    // Lấy thông tin từ request body do front-end gửi lên
    const { name, email, password, phone } = req.body;

    try {
        // Kiểm tra xem email đã được người khác sử dụng chưa
        const userExists = await User.findOne({ email });
        if (userExists) {
            // Nếu email tồn tại, trả về lỗi 400 (Bad Request)
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        // Tạo một người dùng mới trong database
        // Mật khẩu sẽ được tự động mã hóa nhờ middleware .pre('save') trong User model
        const user = await User.create({ name, email, password, phone });

        // Nếu người dùng được tạo thành công
        if (user) {
            // Trả về thông tin cơ bản và một token mới cho phiên đăng nhập đầu tiên
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ' });
        }
    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Xác thực người dùng và cấp token.
 * @route   POST /api/auth/login
 * @access  Public
 */
const authUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Tìm người dùng trong database bằng email
        const user = await User.findOne({ email });

        // Nếu tìm thấy người dùng VÀ mật khẩu người dùng nhập vào khớp với mật khẩu trong DB
        // (sử dụng hàm `matchPassword` đã định nghĩa trong User model để so sánh)
        if (user && (await user.matchPassword(password))) {
            // Trả về thông tin người dùng và một token mới
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            // Nếu không, trả về lỗi 401 (Unauthorized)
            res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }
    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = { registerUser, authUser };