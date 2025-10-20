const User = require('../models/User');

/**
 * @desc    Lấy thông tin hồ sơ của người dùng đang đăng nhập.
 * @route   GET /api/users/profile
 * @access  Private (Yêu cầu đăng nhập)
 */
const getUserProfile = async (req, res) => {
    try {
        // `req.user` đã được middleware `protect` tìm và gắn vào từ trước.
        // Đây là cách lấy thông tin người dùng một cách an toàn và đáng tin cậy.
        const user = req.user;
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error("Lỗi khi lấy profile:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * @desc    Cập nhật thông tin hồ sơ của người dùng đang đăng nhập.
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            // Cập nhật các trường nếu chúng được cung cấp trong request body.
            // Nếu không, giữ lại giá trị cũ.
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            
            // Nếu người dùng cung cấp mật khẩu mới, nó sẽ được cập nhật.
            // Middleware .pre('save') trong User model sẽ tự động mã hóa mật khẩu này.
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();
            
            // Trả về thông tin đã cập nhật.
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error("Lỗi khi cập nhật profile:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/**
 * @desc    Lấy danh sách tất cả người dùng.
 * @route   GET /api/users
 * @access  Private/Admin (Chỉ Admin mới có quyền truy cập)
 */
const getUsers = async (req, res) => {
    try {
        // Tìm tất cả các document trong collection 'users' và loại bỏ trường password
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};


module.exports = { getUserProfile, updateUserProfile, getUsers };