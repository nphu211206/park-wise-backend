// booking.js (Phiên bản Sửa lỗi và Hoàn thiện nhất)
document.addEventListener('DOMContentLoaded', async function() {
    
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const params = new URLSearchParams(window.location.search);
    const lotId = params.get('id');

    // Khai báo các element trên trang
    const elements = {
        fullNameInput: document.getElementById('fullName'),
        phoneNumberInput: document.getElementById('phoneNumber'),
        vehicleNumberInput: document.getElementById('vehicleNumber'),
        startTimeInput: document.getElementById('startTime'),
        endTimeInput: document.getElementById('endTime'),
        cardNumberInput: document.getElementById('cardNumber'),
        expiryDateInput: document.getElementById('expiryDate'),
        cvcInput: document.getElementById('cvc'),
        lotName: document.getElementById('lotName'),
        lotAddress: document.getElementById('lotAddress'),
        lotPrice: document.getElementById('lotPrice'),
        parkingFeeText: document.getElementById('parkingFeeText'),
        totalCostText: document.getElementById('totalCostText'),
        bookingForm: document.getElementById('bookingForm'),
        submitButton: document.querySelector('#bookingForm button[type="submit"]')
    };

    let lotBasePrice = 0;
    const serviceFee = 5000;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    if (!token || !userInfo) {
        alert('Bạn phải đăng nhập!');
        window.location.href = 'login.html';
        return;
    }
    if (!lotId) {
        alert('Không tìm thấy thông tin bãi xe.');
        window.location.href = 'user-dashboard.html';
        return;
    }

    // Tự động điền thông tin người dùng
    if (userInfo) {
        elements.fullNameInput.value = userInfo.name || '';
        // SỬA LỖI 'split': Kiểm tra xem userInfo.email có tồn tại không trước khi split
        if (userInfo.email && typeof userInfo.email === 'string') {
            const phoneFromEmail = userInfo.email.split('@')[0];
            elements.phoneNumberInput.value = phoneFromEmail || '';
        }
    }

    // Lấy thông tin chi tiết của bãi xe
    try {
        const response = await fetch(`${API_URL}/parking-lots/${lotId}`, { headers });
        if (!response.ok) throw new Error('Không thể tải thông tin chi tiết bãi xe');
        const lot = await response.json();
        elements.lotName.textContent = lot.name;
        elements.lotAddress.textContent = lot.address;
        lotBasePrice = lot.dynamicPrice || lot.basePrice;
        elements.lotPrice.textContent = `${lotBasePrice.toLocaleString('vi-VN')} VNĐ/giờ (Giá động)`;
    } catch (error) {
        elements.lotName.textContent = 'Lỗi tải dữ liệu';
        console.error("Lỗi khi fetch chi tiết bãi xe:", error);
    }

    // Logic tính giá tiền tự động
    function calculateCost() {
        const start = new Date(elements.startTimeInput.value);
        const end = new Date(elements.endTimeInput.value);
        if (elements.startTimeInput.value && elements.endTimeInput.value && end > start) {
            const hours = Math.ceil(Math.abs(end - start) / 36e5);
            const parkingFee = hours * lotBasePrice;
            const totalCost = parkingFee + serviceFee;
            elements.parkingFeeText.textContent = `${parkingFee.toLocaleString('vi-VN')} VNĐ (${hours} giờ)`;
            elements.totalCostText.textContent = `${totalCost.toLocaleString('vi-VN')} VNĐ`;
        } else {
            elements.parkingFeeText.textContent = 'Chọn thời gian hợp lệ';
            elements.totalCostText.textContent = `${serviceFee.toLocaleString('vi-VN')} VNĐ`;
        }
    }
    elements.startTimeInput.addEventListener('input', calculateCost);
    elements.endTimeInput.addEventListener('input', calculateCost);

    // Xử lý submit form với thanh toán giả lập
    elements.bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        elements.submitButton.disabled = true;
        elements.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...';

        const bookingData = {
            parkingLotId: lotId,
            startTime: elements.startTimeInput.value,
            endTime: elements.endTimeInput.value,
            vehicleNumber: elements.vehicleNumberInput.value,
            fakeCardDetails: {
                cardNumber: elements.cardNumberInput.value,
                expiryDate: elements.expiryDateInput.value,
                cvc: elements.cvcInput.value,
            }
        };
        try {
            const response = await fetch(`${API_URL}/bookings/create-and-pay`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(bookingData)
            });
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message);
            window.location.href = 'booking-success.html';
        } catch (error) {
            alert(`Lỗi: ${error.message}`);
            elements.submitButton.disabled = false;
            elements.submitButton.innerHTML = 'Thanh toán và Hoàn tất';
        }
    });
});