// controllers/userController.js (Thêm CRUD cho Vehicles)

const User = require('../models/User');
const mongoose = require('mongoose'); // Cần cho ObjectId validation

/**
 * @desc    Lấy thông tin hồ sơ của người dùng đang đăng nhập (bao gồm cả vehicles).
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        // `req.user` đã được middleware `protect` lấy đầy đủ thông tin (trừ password)
        const user = req.user;
        if (user) {
            // Trả về nhiều thông tin hơn, bao gồm cả vehicles
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                vehicles: user.vehicles || [], // Trả về mảng rỗng nếu chưa có
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
                // Thêm các trường profile khác nếu có (avatarUrl, preferences...)
            });
        } else {
            // Trường hợp này hiếm khi xảy ra nếu middleware protect hoạt động đúng
            res.status(404).json({ message: 'Không tìm thấy người dùng (lỗi không mong muốn).' });
        }
    } catch (error) {
        console.error("Lỗi khi lấy profile:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy hồ sơ người dùng.' });
    }
};

/**
 * @desc    Cập nhật thông tin hồ sơ cơ bản (tên, sđt, password).
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id); // Lấy lại user từ DB để đảm bảo có đủ methods/hooks

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            // user.avatarUrl = req.body.avatarUrl || user.avatarUrl; // Ví dụ cập nhật avatar

            if (req.body.password) {
                 // (Đẳng cấp ✨) Thêm validation độ dài password ở đây
                 if (req.body.password.length < 6) {
                     return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
                 }
                user.password = req.body.password; // Mongoose pre-save hook sẽ mã hóa
            }

            const updatedUser = await user.save(); // Chạy pre-save hooks (hash password, check default vehicle)

            // Trả về thông tin đã cập nhật (không bao gồm password)
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                vehicles: updatedUser.vehicles || [],
                // Trả về các trường khác nếu cần
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng để cập nhật.' });
        }
    } catch (error) {
        console.error("Lỗi khi cập nhật profile:", error);
         // Xử lý lỗi validation từ Mongoose (ví dụ: biển số trùng)
         if (error.name === 'ValidationError' || error.message.includes('Biển số')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi server khi cập nhật hồ sơ.' });
    }
};

// --- (Bùng nổ 💥) API CRUD cho Vehicles ---

/**
 * @desc    Thêm một xe mới cho người dùng đang đăng nhập.
 * @route   POST /api/users/profile/vehicles
 * @access  Private
 */
const addUserVehicle = async (req, res) => {
    const { nickname, numberPlate, type, isDefault } = req.body;

    // --- Validation chi tiết ---
    if (!numberPlate || !type) {
        return res.status(400).json({ message: 'Biển số xe và loại xe là bắt buộc.' });
    }
    // Lấy enum từ model để validate type
     const validVehicleTypes = User.schema.path('vehicles').schema.path('type').enumValues;
     if (!validVehicleTypes.includes(type)) {
          return res.status(400).json({ message: `Loại xe không hợp lệ. Chỉ chấp nhận: ${validVehicleTypes.join(', ')}` });
     }
     // Có thể thêm validation regex cho numberPlate ở đây

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        // Kiểm tra biển số trùng lặp trước khi thêm vào mảng (dù đã có pre-save hook)
        const existingVehicle = user.vehicles.find(v => v.numberPlate === numberPlate.toUpperCase());
        if (existingVehicle) {
            return res.status(400).json({ message: `Biển số "${numberPlate}" đã tồn tại trong danh sách xe của bạn.` });
        }

        // Tạo đối tượng xe mới (Mongoose subdocument)
        const newVehicle = {
            nickname: nickname || null, // Cho phép nickname trống
            numberPlate: numberPlate, // Schema sẽ tự uppercase
            type: type,
            isDefault: isDefault === true // Chuyển đổi thành boolean rõ ràng
        };

        user.vehicles.push(newVehicle);

        // Nếu xe mới được set là default, pre-save hook sẽ xử lý việc bỏ default các xe khác
        const updatedUser = await user.save(); // Chạy pre-save hooks

        res.status(201).json(updatedUser.vehicles); // Trả về toàn bộ danh sách xe đã cập nhật

    } catch (error) {
        console.error("Lỗi khi thêm xe:", error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi server khi thêm xe.' });
    }
};

/**
 * @desc    Lấy danh sách xe của người dùng đang đăng nhập.
 * @route   GET /api/users/profile/vehicles
 * @access  Private
 */
const getUserVehicles = async (req, res) => {
    // Thông tin vehicles đã có sẵn trong req.user từ middleware protect (nếu populate đúng)
    // Hoặc có thể lấy lại từ DB nếu muốn chắc chắn là mới nhất
    try {
         const user = await User.findById(req.user._id).select('vehicles').lean(); // Chỉ lấy vehicles
         if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
         res.json(user.vehicles || []);
    } catch (error) {
         console.error("Lỗi khi lấy danh sách xe:", error);
         res.status(500).json({ message: 'Lỗi server khi lấy danh sách xe.' });
    }
};

/**
 * @desc    Cập nhật thông tin một xe (nickname, type, isDefault).
 * @route   PUT /api/users/profile/vehicles/:vehicleId
 * @access  Private
 */
const updateUserVehicle = async (req, res) => {
    const { vehicleId } = req.params;
    const { nickname, type, isDefault } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({ message: 'ID xe không hợp lệ.' });
    }
    // Validate 'type' nếu được cung cấp
    if (type) {
        const validVehicleTypes = User.schema.path('vehicles').schema.path('type').enumValues;
        if (!validVehicleTypes.includes(type)) {
             return res.status(400).json({ message: `Loại xe không hợp lệ. Chỉ chấp nhận: ${validVehicleTypes.join(', ')}` });
        }
    }


    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        const vehicle = user.vehicles.id(vehicleId); // Tìm subdocument bằng _id
        if (!vehicle) {
            return res.status(404).json({ message: 'Không tìm thấy xe này trong danh sách của bạn.' });
        }

        // Cập nhật các trường được phép
        if (nickname !== undefined) vehicle.nickname = nickname;
        if (type) vehicle.type = type;
        if (isDefault !== undefined) vehicle.isDefault = isDefault === true;
        // Không cho phép sửa numberPlate ở đây (nên là thao tác xóa + thêm mới)

        const updatedUser = await user.save(); // Chạy pre-save hooks (quan trọng cho isDefault)

        res.json(updatedUser.vehicles); // Trả về danh sách xe đã cập nhật

    } catch (error) {
        console.error(`Lỗi khi cập nhật xe ${vehicleId}:`, error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi server khi cập nhật xe.' });
    }
};

/**
 * @desc    Xóa một xe khỏi danh sách của người dùng.
 * @route   DELETE /api/users/profile/vehicles/:vehicleId
 * @access  Private
 */
const deleteUserVehicle = async (req, res) => {
    const { vehicleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({ message: 'ID xe không hợp lệ.' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        const vehicle = user.vehicles.id(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Không tìm thấy xe này để xóa.' });
        }

        // Sử dụng pull để xóa subdocument khỏi mảng
        user.vehicles.pull({ _id: vehicleId });
        // Hoặc cách khác: vehicle.remove(); (cần test lại)

        const updatedUser = await user.save(); // Chạy pre-save hooks (để xử lý isDefault nếu cần)

        res.json(updatedUser.vehicles); // Trả về danh sách xe còn lại

    } catch (error) {
        console.error(`Lỗi khi xóa xe ${vehicleId}:`, error);
        res.status(500).json({ message: 'Lỗi server khi xóa xe.' });
    }
};


// --- Lấy danh sách users (Admin) ---
/**
 * @desc    Lấy danh sách tất cả người dùng (Admin).
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
    try {
        // Tìm tất cả user, loại bỏ password và vehicles (nếu không cần)
        // Thêm sắp xếp và phân trang nếu cần
        const users = await User.find({})
                                .select('-password -vehicles') // Bỏ fields không cần thiết cho list admin
                                .sort({ createdAt: -1 }); // Sắp xếp mới nhất trước
        res.json(users);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng.' });
    }
};

// --- Export ---
module.exports = {
    getUserProfile,
    updateUserProfile,
    getUsers,
    // CRUD Vehicles
    addUserVehicle,
    getUserVehicles,
    updateUserVehicle,
    deleteUserVehicle,
    // Thêm các hàm quản lý user khác (Admin)
};