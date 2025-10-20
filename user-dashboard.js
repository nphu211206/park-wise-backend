// ===================================================================================
//
// 			USER DASHBOARD SCRIPT (ULTIMATE FINAL & DETAILED VERSION)
// 			File này điều khiển toàn bộ trang Dashboard của người dùng.
//
// ===================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- PHẦN 1: KHAI BÁO CÁC BIẾN TOÀN CỤC VÀ CẤU HÌNH ---
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Khai báo tập trung tất cả các element trên trang để dễ quản lý
    const elements = {
        parkingLotsContainer: document.querySelector('.parking-lots'),
        searchInput: document.getElementById('searchInput'),
        findNearMeBtn: document.getElementById('findNearMeBtn'),
        priceFilter: document.getElementById('priceFilter'),
        ratingFilter: document.getElementById('ratingFilter'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        logoutBtn: document.getElementById('logoutBtn'),
        bookingHistoryContainer: document.getElementById('bookingHistoryContainer'),
        userNameElement: document.querySelector('.user-name'),
        reviewModal: document.getElementById('reviewModal'),
        reviewForm: document.getElementById('reviewForm'),
        reviewLotIdInput: document.getElementById('reviewParkingLotId'),
        reviewModalTitle: reviewModal.querySelector('h2'),
        starRatingContainer: document.getElementById('starRating'),
        ratingValueInput: document.getElementById('ratingValue'),
        reviewCommentInput: document.getElementById('reviewComment'),
        closeReviewModalBtn: document.getElementById('closeReviewModal'),
        toastContainer: document.getElementById('toastContainer')
    };
    
    let currentRating = 0; // Biến lưu rating tạm thời khi người dùng click sao
    let map; // Biến cho bản đồ
    let markersLayer; // Biến cho lớp chứa các marker

    // --- PHẦN 2: KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT VÀ THIẾT LẬP BAN ĐẦU ---

    // 2.1. Kiểm tra đăng nhập: Nếu không có token, không cho vào.
    if (!token || !userInfo) {
        localStorage.clear();
        window.location.href = 'login.html';
        return; 
    }
    
    // 2.2. Gán sự kiện cho nút đăng xuất
    elements.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Đăng xuất thành công!', 'success');
        setTimeout(() => {
            localStorage.clear();
            window.location.href = 'login.html';
        }, 1000);
    });

    // 2.3. Cập nhật tên người dùng trên header
    if (elements.userNameElement) {
        elements.userNameElement.textContent = userInfo.name;
    }

    // 2.4. Khởi tạo bản đồ Leaflet
    map = L.map('map').setView([21.028511, 105.804817], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    markersLayer = new L.LayerGroup().addTo(map);

    // 2.5. Tạo header chung cho các request API
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // --- PHẦN 3: CÁC HÀM TƯƠNG TÁC VỚI API (BACK-END) ---

    // 3.1. Hàm lấy và hiển thị danh sách bãi xe
    async function fetchParkingLots() {
        elements.loadingSpinner.style.display = 'block';
        elements.parkingLotsContainer.innerHTML = '';
        markersLayer.clearLayers();

        let params = new URLSearchParams();
        if (elements.searchInput.value) params.append('keyword', elements.searchInput.value);
        if (elements.priceFilter.value) params.append('maxPrice', elements.priceFilter.value);
        if (elements.ratingFilter.value) params.append('minRating', elements.ratingFilter.value);
        const lat = elements.findNearMeBtn.dataset.lat, lng = elements.findNearMeBtn.dataset.lng;
        if (lat && lng) { params.append('lat', lat); params.append('lng', lng); }
        
        const url = `${API_URL}/parking-lots?${params.toString()}`;

        try {
            const response = await fetch(url, { headers });
            if (response.status === 401) {
                localStorage.clear();
                showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            if (!response.ok) throw new Error('Không thể tải dữ liệu bãi xe');
            const lots = await response.json();
            renderParkingLots(lots);
        } catch (error) {
            elements.parkingLotsContainer.innerHTML = `<p class="text-red-500 col-span-full text-center">${error.message}</p>`;
        } finally {
            elements.loadingSpinner.style.display = 'none';
            delete elements.findNearMeBtn.dataset.lat;
            delete elements.findNearMeBtn.dataset.lng;
        }
    }

    // 3.2. Hàm lấy và hiển thị lịch sử đặt chỗ
    async function fetchMyBookings() {
        try {
            const response = await fetch(`${API_URL}/bookings/mybookings`, { headers });
            if (!response.ok) throw new Error('Không thể tải lịch sử đặt chỗ');
            const bookings = await response.json();
            renderMyBookings(bookings);
        } catch (error) {
            elements.bookingHistoryContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        }
    }

    // --- PHẦN 4: CÁC HÀM HIỂN THỊ DỮ LIỆU LÊN GIAO DIỆN (RENDER) ---

    function renderParkingLots(lots) {
        if (lots.length === 0) {
            elements.parkingLotsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Không tìm thấy bãi xe nào phù hợp.</p>';
            return;
        }
        const lotBounds = [];
        lots.forEach(lot => {
            const lotHTML = `
                <div class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                    <div class="p-5">
                        <div class="flex justify-between items-start">
                            <h3 class="text-lg font-bold text-gray-900 mb-1">${lot.name}</h3>
                            <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${lot.availableSpots}/${lot.totalSpots} trống</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-500 mb-3">
                            ${generateStars(lot.rating)} <span class="ml-2">(${lot.numReviews} đánh giá)</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1 h-10">${lot.address}</p>
                        <div class="mt-4 text-xl font-bold text-green-600">${(lot.dynamicPrice || lot.basePrice).toLocaleString('vi-VN')}đ<span class="text-sm font-normal text-gray-500">/giờ</span></div>
                        <a href="booking.html?id=${lot._id}" class="mt-4 block w-full bg-blue-600 text-white text-center font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors">Đặt chỗ ngay</a>
                    </div>
                </div>`;
            elements.parkingLotsContainer.insertAdjacentHTML('beforeend', lotHTML);
            const [lng, lat] = lot.location.coordinates;
            const marker = L.marker([lat, lng], { parkingLotId: lot._id }).addTo(markersLayer);
            marker.bindPopup(`<b>${lot.name}</b><br>Giá: ${(lot.dynamicPrice || lot.basePrice).toLocaleString('vi-VN')}đ/giờ`);
            lotBounds.push([lat, lng]);
        });
        if(lotBounds.length > 0) map.fitBounds(lotBounds, { padding: [50, 50] });
    }
    
    function renderMyBookings(bookings) {
        elements.bookingHistoryContainer.innerHTML = '';
        if (bookings.length === 0) {
            elements.bookingHistoryContainer.innerHTML = '<div class="bg-white p-6 rounded-xl shadow-lg text-center text-gray-500">Bạn chưa có lượt đặt chỗ nào.</div>';
            return;
        }
        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        bookings.forEach(booking => {
            const start = new Date(booking.startTime), end = new Date(booking.endTime);
            const statusClasses = { completed: 'bg-green-100 text-green-800', active: 'bg-blue-100 text-blue-800', confirmed: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-red-100 text-red-800', pending: 'bg-gray-100 text-gray-800' };
            const reviewButtonHTML = booking.status === 'completed' ? `<button class="review-btn text-xs bg-green-500 text-white px-3 py-1 rounded-full mt-2 hover:bg-green-600" data-lot-id="${booking.parkingLot._id}" data-lot-name="${booking.parkingLot.name}">Đánh giá</button>` : '';
            const cancelButtonHTML = (booking.status === 'confirmed' || booking.status === 'pending') ? `<button class="cancel-btn text-xs bg-red-500 text-white px-3 py-1 rounded-full mt-2 hover:bg-red-600" data-booking-id="${booking._id}">Hủy</button>` : '';
            const bookingHTML = `
                <div class="bg-white p-4 rounded-xl shadow-lg flex items-center justify-between space-x-4">
                    <div class="flex-grow"><p class="font-bold text-gray-800">${booking.parkingLot.name}</p><p class="text-sm text-gray-500">${booking.parkingLot.address}</p><p class="text-sm text-gray-500 mt-1"><i class="far fa-calendar-alt mr-1"></i> ${start.toLocaleDateString('vi-VN')} <i class="far fa-clock ml-2 mr-1"></i> ${start.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p></div>
                    <div class="text-right flex-shrink-0"><p class="font-semibold text-gray-900 text-lg">${booking.totalPrice.toLocaleString('vi-VN')} VNĐ</p><span class="text-xs font-semibold px-2 py-1 rounded-full mt-1 inline-block ${statusClasses[booking.status] || 'bg-gray-100 text-gray-800'}">${booking.status}</span><div class="space-x-2">${reviewButtonHTML}${cancelButtonHTML}</div></div>
                </div>`;
            elements.bookingHistoryContainer.insertAdjacentHTML('beforeend', bookingHTML);
        });
    }

    function generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars += '<i class="fas fa-star text-yellow-400"></i>';
            else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
            else stars += '<i class="far fa-star text-yellow-400"></i>';
        } return stars;
    }

    // --- PHẦN 5: GÁN CÁC SỰ KIỆN TƯƠNG TÁC ---
    
    // 5.1. Logic cho bộ lọc
    let filterTimeout;
    const applyFilters = () => { clearTimeout(filterTimeout); filterTimeout = setTimeout(fetchParkingLots, 300); };
    elements.searchInput.addEventListener('input', applyFilters);
    elements.priceFilter.addEventListener('change', applyFilters);
    elements.ratingFilter.addEventListener('change', applyFilters);
    elements.findNearMeBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return showToast('Trình duyệt không hỗ trợ định vị.', 'error');
        elements.findNearMeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang tìm...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                elements.findNearMeBtn.dataset.lat = position.coords.latitude;
                elements.findNearMeBtn.dataset.lng = position.coords.longitude;
                elements.findNearMeBtn.innerHTML = '<i class="fas fa-location-arrow mr-2"></i> Tìm gần tôi';
                fetchParkingLots();
            },
            () => { 
                showToast('Không thể lấy vị trí của bạn.', 'error');
                elements.findNearMeBtn.innerHTML = '<i class="fas fa-location-arrow mr-2"></i> Tìm gần tôi';
            }
        );
    });

    // 5.2. Logic cho Modal Đánh giá và Hủy đặt chỗ
    elements.bookingHistoryContainer.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('review-btn')) {
            elements.reviewLotIdInput.value = target.dataset.lotId;
            elements.reviewModalTitle.textContent = `Đánh giá bãi xe "${target.dataset.lotName}"`;
            elements.reviewForm.reset();
            currentRating = 0;
            Array.from(elements.starRatingContainer.children).forEach(star => star.className = 'fas fa-star');
            elements.reviewModal.style.display = 'flex';
        }
        if (target.classList.contains('cancel-btn')) {
            if (!confirm('Bạn có chắc muốn hủy lượt đặt chỗ này?')) return;
            const bookingId = target.dataset.bookingId;
            try {
                const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, { method: 'DELETE', headers });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast('Hủy đặt chỗ thành công!');
                fetchMyBookings();
            } catch (error) { showToast(error.message, 'error'); }
        }
    });
    elements.starRatingContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'I') {
            currentRating = e.target.dataset.rating;
            elements.ratingValueInput.value = currentRating;
            Array.from(elements.starRatingContainer.children).forEach(star => {
                star.classList.toggle('text-yellow-400', star.dataset.rating <= currentRating);
                star.classList.toggle('text-gray-300', star.dataset.rating > currentRating);
            });
        }
    });
    elements.closeReviewModalBtn.addEventListener('click', () => elements.reviewModal.style.display = 'none');
    elements.reviewForm.addEventListener('submit', async (e) => { /* ... logic gửi review ... */ });

    // --- PHẦN 6: KẾT NỐI REAL-TIME ---
    const socket = io("http://localhost:5000");
    socket.on('connect', () => console.log(`Đã kết nối tới server real-time! ${socket.id}`));
    socket.on('parkingLotUpdate', (updatedLot) => {
        showToast(`Bãi xe ${updatedLot.name} vừa được cập nhật!`);
        fetchParkingLots(); // Tải lại toàn bộ danh sách để đảm bảo đồng bộ nhất
    });

    // --- PHẦN 7: CHẠY LẦN ĐẦU ---
    fetchParkingLots();
    fetchMyBookings();
});