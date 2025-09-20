// admin-bookings.js
document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    if (!token) { window.location.href = 'login.html'; return; }
    const headers = { 'Authorization': `Bearer ${token}` };

    const tableBody = document.getElementById('bookingsTableBody');
    const searchInput = document.getElementById('bookingSearchInput');
    let allBookings = []; // Lưu trữ toàn bộ booking để lọc phía client

    const fetchAndRenderBookings = async () => {
        try {
            const response = await fetch(`${API_URL}/bookings`, { headers });
            allBookings = await response.json();
            renderTable(allBookings);
        } catch (error) { console.error('Lỗi tải booking:', error); }
    };

    const renderTable = (bookings) => {
        tableBody.innerHTML = '';
        bookings.forEach(booking => {
            const start = new Date(booking.startTime);
            const row = `
                <tr class="border-b border-gray-200 hover:bg-gray-100">
                    <td class="py-3 px-6">${booking.user.name}</td>
                    <td class="py-3 px-6">${booking.parkingLot.name}</td>
                    <td class="py-3 px-6 text-center">${start.toLocaleString('vi-VN')}</td>
                    <td class="py-3 px-6 text-center">${booking.totalPrice.toLocaleString('vi-VN')}đ</td>
                    <td class="py-3 px-6 text-center"><span class="bg-blue-200 text-blue-600 py-1 px-3 rounded-full text-xs">${booking.status}</span></td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.toLowerCase().trim();
        const filteredBookings = allBookings.filter(b => 
            b.user.name.toLowerCase().includes(keyword) || 
            b.parkingLot.name.toLowerCase().includes(keyword)
        );
        renderTable(filteredBookings);
    });

    fetchAndRenderBookings();
});