const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Thư viện chuyên dụng để mã hóa mật khẩu

// Định nghĩa cấu trúc (Schema) cho User
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