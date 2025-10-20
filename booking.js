// booking.js (Bản sửa lỗi và hoàn thiện)
document.addEventListener('DOMContentLoaded', async function() {
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // ... (phần code lấy lotId và kiểm tra token/lotId giữ nguyên)
    const params = new URLSearchParams(window.location.search);
    const lotId = params.get('id');
    if (!token) { /* ... */ }
    if (!lotId) { /* ... */ }
    
    // Tự động điền thông tin người dùng đã đăng nhập
    if (userInfo) {
        document.getElementById('fullName').value = userInfo.name || '';
        // Giả sử email có dạng sđt@parkwise.com, chúng ta tách lấy sđt
        const phoneFromEmail = userInfo.email.split('@')[0];
        document.getElementById('phoneNumber').value = phoneFromEmail || '';
    }

    let lotBasePrice = 0;
    try {
        const response = await fetch(`${API_URL}/parking-lots/${lotId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Không thể tải thông tin bãi xe');
        const lot = await response.json();

        document.getElementById('lotName').textContent = lot.name;
        document.getElementById('lotAddress').textContent = lot.address;
        document.getElementById('lotPrice').textContent = `${lot.basePrice.toLocaleString('vi-VN')} VNĐ/giờ`;
        lotBasePrice = lot.basePrice;
    } catch (error) {
        document.getElementById('lotName').textContent = 'Lỗi tải dữ liệu';
        console.error(error);
    }

    // --- LOGIC TÍNH GIÁ TIỀN TỰ ĐỘNG ---
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const parkingFeeText = document.getElementById('parkingFeeText');
    const totalCostText = document.getElementById('totalCostText');
    const serviceFee = 5000;

    function calculateCost() {
        // ... (hàm calculateCost giữ nguyên như cũ)
        const start = new Date(startTimeInput.value);
        const end = new Date(endTimeInput.value);
        if (startTimeInput.value && endTimeInput.value && end > start) {
            const hours = Math.ceil(Math.abs(end - start) / 36e5);
            const parkingFee = hours * lotBasePrice;
            const totalCost = parkingFee + serviceFee;
            parkingFeeText.textContent = `${parkingFee.toLocaleString('vi-VN')} VNĐ (${hours} giờ)`;
            totalCostText.textContent = `${totalCost.toLocaleString('vi-VN')} VNĐ`;
        } else {
            parkingFeeText.textContent = 'Chọn thời gian hợp lệ';
            totalCostText.textContent = `${serviceFee.toLocaleString('vi-VN')} VNĐ`;
        }
    }

    startTimeInput.addEventListener('input', calculateCost);
    endTimeInput.addEventListener('input', calculateCost);

    // --- Xử lý form đặt chỗ ---
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const bookingData = {
            parkingLotId: lotId,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value,
            vehicleNumber: document.getElementById('vehicleNumber').value
        };
        // ... (phần code gửi request và xử lý kết quả giữ nguyên như cũ)
        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });
            const createdBooking = await response.json();
             if (!response.ok) {
                 throw new Error(createdBooking.message || 'Đặt chỗ thất bại');
            }
            alert(`Đặt chỗ thành công! Mã đặt chỗ của bạn là: ${createdBooking._id}`);
            window.location.href = 'user-dashboard.html';

        } catch (error) {
            alert(`Lỗi: ${error.message}`);
        }
    });
});