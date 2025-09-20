// parking-management.js
document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    // Kiểm tra xem người dùng có phải admin không, nếu không thì không cho vào
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!token || !userInfo || userInfo.role !== 'admin') { 
        alert('TRUY CẬP BỊ TỪ CHỐI!');
        window.location.href = 'login.html'; 
        return; 
    }
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`};

    const tableBody = document.getElementById('parkingTableBody');
    const modal = document.getElementById('parkingModal');
    const modalTitle = document.getElementById('modalTitle');
    const parkingForm = document.getElementById('parkingForm');
    const parkingIdInput = document.getElementById('parkingId');

    // --- CÁC HÀM XỬ LÝ MODAL ---
    const openModal = (mode = 'add', lot = null) => {
        parkingForm.reset();
        if (mode === 'edit' && lot) {
            modalTitle.textContent = 'Chỉnh sửa bãi xe';
            parkingIdInput.value = lot._id;
            document.getElementById('parkingName').value = lot.name;
            document.getElementById('parkingAddress').value = lot.address;
            document.getElementById('totalSpots').value = lot.totalSpots;
            document.getElementById('basePrice').value = lot.basePrice;
            document.getElementById('parkingStatus').value = lot.status;
            document.getElementById('coordLng').value = lot.location.coordinates[0];
            document.getElementById('coordLat').value = lot.location.coordinates[1];
        } else {
            modalTitle.textContent = 'Thêm bãi xe mới';
            parkingIdInput.value = '';
        }
        modal.classList.add('active');
    };
    const closeModal = () => modal.classList.remove('active');

    document.getElementById('addParkingBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    // --- HÀM LẤY VÀ HIỂN THỊ DỮ LIỆU ---
    const fetchAndRenderLots = async () => {
        try {
            const response = await fetch(`${API_URL}/parking-lots`, { headers });
            const lots = await response.json();
            tableBody.innerHTML = '';
            lots.forEach(lot => {
                const row = `
                    <tr class="border-b border-gray-200 hover:bg-gray-100">
                        <td class="py-3 px-6 text-left whitespace-nowrap">${lot.name}</td>
                        <td class="py-3 px-6 text-left">${lot.address}</td>
                        <td class="py-3 px-6 text-center">${lot.availableSpots}/${lot.totalSpots}</td>
                        <td class="py-3 px-6 text-center">${lot.basePrice.toLocaleString('vi-VN')}</td>
                        <td class="py-3 px-6 text-center">
                            <span class="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">${lot.status}</span>
                        </td>
                        <td class="py-3 px-6 text-center">
                            <button data-id="${lot._id}" class="edit-btn bg-yellow-500 text-white py-1 px-2 rounded hover:bg-yellow-600">Sửa</button>
                            <button data-id="${lot._id}" class="delete-btn bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600">Xóa</button>
                        </td>
                    </tr>`;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) { console.error('Lỗi tải bãi xe:', error); }
    };

    // --- XỬ LÝ SUBMIT FORM (THÊM/SỬA) ---
    parkingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parkingIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/parking-lots/${id}` : `${API_URL}/parking-lots`;
        
        const formData = {
            name: document.getElementById('parkingName').value,
            address: document.getElementById('parkingAddress').value,
            totalSpots: parseInt(document.getElementById('totalSpots').value),
            basePrice: parseInt(document.getElementById('basePrice').value),
            status: document.getElementById('parkingStatus').value,
            coordinates: [
                parseFloat(document.getElementById('coordLng').value),
                parseFloat(document.getElementById('coordLat').value)
            ]
        };

        try {
            const response = await fetch(url, { method, headers, body: JSON.stringify(formData) });
            if (!response.ok) throw new Error('Thao tác thất bại');
            closeModal();
            fetchAndRenderLots();
        } catch (error) { console.error('Lỗi khi lưu:', error); alert(error.message); }
    });

    // --- XỬ LÝ NÚT SỬA/XÓA TRÊN BẢNG ---
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('edit-btn')) {
            const response = await fetch(`${API_URL}/parking-lots/${id}`, { headers });
            const lot = await response.json();
            openModal('edit', lot);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Bạn có chắc chắn muốn xóa bãi xe này? Thao tác này không thể hoàn tác!')) {
                try {
                    const response = await fetch(`${API_URL}/parking-lots/${id}`, { method: 'DELETE', headers });
                    if (!response.ok) throw new Error('Xóa thất bại');
                    fetchAndRenderLots();
                } catch (error) { console.error('Lỗi khi xóa:', error); alert(error.message); }
            }
        }
    });

    // Tải dữ liệu lần đầu
    fetchAndRenderLots();
});