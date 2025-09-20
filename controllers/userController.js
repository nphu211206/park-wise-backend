// controllers/userController.js (Bản Hoàn thiện chức năng Quản trị)
const User = require('../models/User');

/**
 * @desc    Lấy thông tin hồ sơ của người dùng đang đăng nhập.
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
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
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            if (req.body.password) {
                user.password = req.body.password; // Mongoose's pre-save hook sẽ tự động hash
            }
            const updatedUser = await user.save();
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
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// --- CÁC CHỨC NĂNG MỚI DÀNH CHO ADMIN ---

/**
 * @desc    Lấy danh sách tất cả người dùng.
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

/**
 * @desc    Admin xóa một người dùng.
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            // Thêm logic để không cho phép admin tự xóa chính mình
            if(user.role === 'admin') {
                return res.status(400).json({ message: 'Không thể xóa tài khoản Admin.' });
            }
            await user.deleteOne();
            res.json({ message: 'Người dùng đã được xóa' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

/**
 * @desc    Admin cập nhật thông tin một người dùng (ví dụ: phong làm admin).
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.role = req.body.role || user.role;
            const updatedUser = await user.save();
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
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};


module.exports = { getUserProfile, updateUserProfile, getUsers, deleteUser, updateUser };