document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    if (!token) { window.location.href = 'login.html'; return; }
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`};

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const form = document.getElementById('profileForm');

    // Hàm Toast Notification
    function showToast(message, type = 'success') { /* ... copy từ lần trước ... */ }

    // Lấy thông tin profile hiện tại và điền vào form
    async function loadProfile() {
        try {
            const response = await fetch(`${API_URL}/users/profile`, { headers });
            const user = await response.json();
            if (!response.ok) throw new Error(user.message);

            nameInput.value = user.name;
            emailInput.value = user.email;
            phoneInput.value = user.phone;
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Xử lý submit form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (passwordInput.value !== confirmPasswordInput.value) {
            return showToast('Mật khẩu xác nhận không khớp!', 'error');
        }

        const body = {
            name: nameInput.value,
            phone: phoneInput.value,
        };

        if (passwordInput.value) {
            body.password = passwordInput.value;
        }

        try {
            const response = await fetch(`${API_URL}/users/profile`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast('Cập nhật hồ sơ thành công!');
            // Cập nhật lại userInfo trong localStorage
            const oldUserInfo = JSON.parse(localStorage.getItem('userInfo'));
            oldUserInfo.name = data.name;
            localStorage.setItem('userInfo', JSON.stringify(oldUserInfo));

            passwordInput.value = '';
            confirmPasswordInput.value = '';

        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    loadProfile();
});