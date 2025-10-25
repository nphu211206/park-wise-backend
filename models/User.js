const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Thư viện chuyên dụng để mã hóa mật khẩu

// Định nghĩa cấu trúc (Schema) cho User
const vehicleSchema = new mongoose.Schema({
    nickname: { // Tên gợi nhớ (VD: "Xe Vợ", "Xe Đi Làm")
        type: String,
        trim: true,
        maxlength: [50, 'Tên gợi nhớ không quá 50 ký tự']
    },
    numberPlate: { // Biển số xe
        type: String,
        required: [true, 'Biển số xe là bắt buộc'],
        trim: true,
        uppercase: true,
        // (Đẳng cấp ✨) Thêm unique constraint trong mảng vehicles của user
        // validate: { ... } // Có thể thêm regex validation cho biển số VN
    },
    type: { // Loại xe
        type: String,
        required: [true, 'Loại xe là bắt buộc'],
        enum: ['motorbike', 'car_4_seats', 'car_7_seats', 'suv', 'ev_car', 'any'], // Đồng bộ với ParkingLot
    },
    isDefault: { // Xe mặc định?
        type: Boolean,
        default: false,
    },
    // (Bùng nổ 💥) Thêm thông tin khác nếu cần
    // color: String,
    // model: String,
    // imageUrl: String,
}, { _id: true }); // Bật _id cho sub-document để dễ dàng update/delete
const userSchema = new mongoose.Schema(
    {
        // Tên người dùng, là bắt buộc (required)
        name: { 
            type: String, 
            required: [true, 'Vui lòng nhập tên của bạn'] 
        },
        // Email, là bắt buộc và phải là duy nhất (unique) trong toàn bộ database
        email: { 
            type: String, 
            required: [true, 'Vui lòng nhập email'], 
            unique: true,
            match: [/.+\@.+\..+/, 'Vui lòng nhập một địa chỉ email hợp lệ'] // Kiểm tra định dạng email cơ bản
        },
        // Mật khẩu, là bắt buộc
        password: { 
            type: String, 
            required: [true, 'Vui lòng nhập mật khẩu']
        },
        // Số điện thoại, là bắt buộc
        phone: { 
            type: String, 
            required: [true, 'Vui lòng nhập số điện thoại']
        },
        // Vai trò của người dùng, chỉ có thể là 'user' hoặc 'admin'
        // Điều này đảm bảo tính toàn vẹn dữ liệu cho việc phân quyền
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user' // Mặc định khi tạo mới là 'user'
        }
    },
    {
        // Tự động thêm hai trường: createdAt và updatedAt
        // Rất hữu ích cho việc theo dõi và gỡ lỗi.
        timestamps: true 
    }
);

/**
 * Middleware của Mongoose: .pre('save')
 * Đoạn mã này sẽ tự động chạy TRƯỚC KHI một đối tượng User được lưu vào database.
 * Nhiệm vụ của nó là kiểm tra xem mật khẩu có bị thay đổi không. Nếu có, nó sẽ mã hóa mật khẩu mới.
 */
userSchema.pre('save', function(next) {
    if (this.isModified('vehicles')) {
        let defaultCount = 0;
        let defaultIndex = -1;

        this.vehicles.forEach((vehicle, index) => {
            if (vehicle.isDefault) {
                defaultCount++;
                defaultIndex = index;
            }
            // (Đẳng cấp ✨) Đảm bảo biển số là unique cho user này
            const duplicatePlate = this.vehicles.find((v, i) => i !== index && v.numberPlate === vehicle.numberPlate);
            if (duplicatePlate) {
                 return next(new Error(`Biển số "${vehicle.numberPlate}" đã được thêm.`));
            }
        });

        if (defaultCount > 1) {
            // Nếu có nhiều xe default, chỉ giữ lại cái cuối cùng được đánh dấu
            this.vehicles.forEach((vehicle, index) => {
                if (index !== defaultIndex) {
                    vehicle.isDefault = false;
                }
            });
         } else if (defaultCount === 0 && this.vehicles.length === 1) {
             // Nếu chỉ có 1 xe và chưa có xe default, tự động đặt nó làm default
             this.vehicles[0].isDefault = true;
         } else if (defaultCount === 0 && defaultIndex !== -1 && this.vehicles.length > 0) {
             // Nếu không có xe default nào được chọn nhưng trước đó có xe default (và giờ nó bị xóa/sửa)
             // -> Đặt xe đầu tiên làm default (nếu còn xe)
             this.vehicles[0].isDefault = true;
         }
    }
    next();
});
userSchema.pre('save', async function(next) {
    // Nếu mật khẩu không được sửa đổi (ví dụ: người dùng chỉ cập nhật tên), bỏ qua bước mã hóa.
    if (!this.isModified('password')) {
        return next();
    }
    // Tạo một chuỗi ngẫu nhiên (salt) để tăng cường bảo mật cho việc mã hóa.
    const salt = await bcrypt.genSalt(10);
    // Thực hiện mã hóa mật khẩu (hashing) và gán lại vào đối tượng user.
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Thêm một phương thức (method) riêng cho đối tượng User.
 * Dùng để so sánh mật khẩu người dùng nhập vào (khi đăng nhập) với mật khẩu đã được mã hóa trong database.
 * @param {string} enteredPassword - Mật khẩu người dùng cung cấp khi đăng nhập.
 * @returns {Promise<boolean>} - Trả về true nếu mật khẩu khớp, ngược lại trả về false.
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


// Tạo Model 'User' từ Schema đã định nghĩa
const User = mongoose.model('User', userSchema);
module.exports = User;