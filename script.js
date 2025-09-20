document.addEventListener("DOMContentLoaded", function() {
    // Địa chỉ của server Back-end
    const API_URL = 'http://localhost:5000/api';

    const container = document.querySelector('.container');
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');

    if (registerBtn) {
        registerBtn.addEventListener('click', () => container.classList.add('active'));
    }
    if (loginBtn) {
        loginBtn.addEventListener('click', () => container.classList.remove('active'));
    }

    // ======================================================
    // LOGIC ĐĂNG KÝ TÀI KHOẢN
    // ======================================================
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            // Lấy dữ liệu từ form
            const name = document.getElementById("registerUsername").value;
            const phone = document.getElementById("registerPhone").value;
            const password = document.getElementById("registerPassword").value;
            // Tạm thời dùng phone làm email để đơn giản, bạn có thể thêm ô input email sau
            const email = `${phone}@parkwise.com`;

            try {
                // Gửi dữ liệu đến API Back-end
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password, phone }),
                });

                const data = await response.json();

                if (!response.ok) {
                    // Nếu có lỗi từ server (ví dụ: email đã tồn tại)
                    throw new Error(data.message || 'Có lỗi xảy ra');
                }

                // Đăng ký thành công
                alert('✅ Đăng ký thành công! Vui lòng chuyển qua form đăng nhập.');
                // Tự động chuyển về form đăng nhập
                container.classList.remove('active');

            } catch (error) {
                // Hiển thị lỗi
                alert(`❌ Lỗi: ${error.message}`);
            }
        });
    }

    // ======================================================
    // LOGIC ĐĂNG NHẬP
    // ======================================================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            const usernameOrEmail = document.getElementById("username").value; // User có thể nhập email hoặc phone
            const password = document.getElementById("password").value;

            // Tạm thời coi user nhập email (vd: 0987654321@parkwise.com)
            const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@parkwise.com`;

            try {
                 // Gửi dữ liệu đến API Back-end
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Có lỗi xảy ra');
                }

                // Đăng nhập thành công, server trả về token
                alert('✅ Đăng nhập thành công!');
                
                // Lưu token vào localStorage để dùng cho các request sau này
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userInfo', JSON.stringify(data));

                // Chuyển hướng đến trang dashboard
                window.location.href = "user-dashboard.html";

            } catch (error) {
                alert(`❌ Lỗi: ${error.message}`);
            }
        });
    }

});