// admin-dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // --- KIỂM TRA QUYỀN ADMIN ---
    if (!token || !userInfo || userInfo.role !== 'admin') {
        alert('TRUY CẬP BỊ TỪ CHỐI! BẠN KHÔNG PHẢI LÀ ADMIN.');
        window.location.href = 'login.html';
        return;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- HÀM LẤY DỮ LIỆU VÀ CẬP NHẬT GIAO DIỆN ---
    async function loadDashboardData() {
        try {
            // Sử dụng Promise.all để gọi nhiều API cùng lúc cho hiệu năng tối đa
            const [lotsResponse, bookingsResponse, usersResponse] = await Promise.all([
                fetch(`${API_URL}/parking-lots`, { headers }),
                fetch(`${API_URL}/bookings`, { headers }),
                fetch(`${API_URL}/users`, { headers })
            ]);

            const lots = await lotsResponse.json();
            const bookings = await bookingsResponse.json();
            const users = await usersResponse.json();
            
            updateStatCards(lots, bookings, users);
            renderRevenueChart(bookings);
            updateRecentBookings(bookings);
            
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu Dashboard:", error);
        }
    }

    // --- CẬP NHẬT CÁC THẺ THỐNG KÊ ---
    function updateStatCards(lots, bookings, users) {
        // Tổng bãi xe
        document.getElementById('totalLots').textContent = lots.length;

        // Người dùng
        document.getElementById('totalUsers').textContent = users.length;
        
        // Đặt chỗ hôm nay
        const today = new Date().setHours(0, 0, 0, 0);
        const todayBookings = bookings.filter(b => new Date(b.createdAt).setHours(0, 0, 0, 0) === today).length;
        document.getElementById('todayBookings').textContent = todayBookings;

        // Doanh thu tháng này
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = bookings
            .filter(b => {
                const bookingDate = new Date(b.createdAt);
                return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
            })
            .reduce((sum, b) => sum + b.totalPrice, 0);
        document.getElementById('monthlyRevenue').textContent = `${(monthlyRevenue / 1000000).toFixed(1)}M`;
    }

    // --- VẼ BIỂU ĐỒ DOANH THU ---
    function renderRevenueChart(bookings) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        // Xử lý dữ liệu: tính tổng doanh thu theo từng ngày trong 7 ngày gần nhất
        const data = {};
        for(let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('vi-VN');
            data[key] = 0;
        }

        bookings.forEach(b => {
            const key = new Date(b.createdAt).toLocaleDateString('vi-VN');
            if (data[key] !== undefined) {
                data[key] += b.totalPrice;
            }
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: Object.values(data),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // --- HIỂN THỊ CÁC BOOKING GẦN ĐÂY ---
    function updateRecentBookings(bookings) {
        const container = document.getElementById('recentBookingsList');
        container.innerHTML = '';
        bookings.slice(0, 5).forEach(b => { // Lấy 5 booking mới nhất
            const item = `
                <div class="booking-item">
                    <div class="booking-info">
                        <div class="booking-user">${b.user.name}</div>
                        <div class="booking-details">${b.parkingLot.name}</div>
                    </div>
                    <div class="booking-amount">${b.totalPrice.toLocaleString('vi-VN')}đ</div>
                    <div class="booking-status confirmed">${b.status}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', item);
        });
    }

    // Chạy hàm chính khi tải trang
    loadDashboardData();
});