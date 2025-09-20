// admin-products.js
document.addEventListener('DOMContentLoaded', function() {
    // --- PHẦN 1: CẤU HÌNH VÀ KHAI BÁO BIẾN ---
    const API_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Kiểm tra quyền Admin, nếu không phải thì đuổi về trang đăng nhập
    if (!token || !userInfo || userInfo.role !== 'admin') {
        alert('TRUY CẬP BỊ TỪ CHỐI! BẠN KHÔNG PHẢI LÀ ADMIN.');
        window.location.href = 'login.html';
        return;
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // Khai báo các element của trang
    const tableBody = document.getElementById('productTableBody');
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');

    // --- PHẦN 2: CÁC HÀM XỬ LÝ MODAL (CỬA SỔ THÊM/SỬA) ---
    const openModal = (mode = 'add', product = null) => {
        productForm.reset(); // Xóa hết dữ liệu cũ trong form
        if (mode === 'edit' && product) {
            // Chế độ sửa: Điền thông tin của sản phẩm vào form
            modalTitle.textContent = 'Chỉnh sửa sản phẩm';
            productIdInput.value = product._id;
            document.getElementById('productName').value = product.name;
            document.getElementById('imageUrl').value = product.imageUrl;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('affiliateUrl').value = product.affiliateUrl;
            document.getElementById('productCategory').value = product.category;
        } else {
            // Chế độ thêm: Để form trống
            modalTitle.textContent = 'Thêm sản phẩm mới';
            productIdInput.value = '';
        }
        modal.classList.add('active'); // Hiển thị modal
    };
    const closeModal = () => modal.classList.remove('active'); // Ẩn modal

    document.getElementById('addProductBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    // --- PHẦN 3: HÀM LẤY VÀ HIỂN THỊ DỮ LIỆU SẢN PHẨM ---
    const fetchAndRenderProducts = async () => {
        try {
            // API GET /api/products sẽ trả về ngẫu nhiên. Để quản lý, ta cần 1 API khác.
            // Tạm thời, chúng ta sẽ tạo 1 API GET /api/products/all cho admin.
            // ** Cần nâng cấp back-end cho việc này **
            // Tạm thời vẫn dùng API cũ để hiển thị, dù nó chỉ trả về ngẫu nhiên
            const response = await fetch(`${API_URL}/products`, { headers });
            const products = await response.json();
            
            tableBody.innerHTML = ''; // Xóa bảng cũ
            products.forEach(product => {
                const row = `
                    <tr class="border-b border-gray-200 hover:bg-gray-100">
                        <td class="py-3 px-6 flex items-center">
                            <img src="${product.imageUrl}" alt="${product.name}" class="w-10 h-10 rounded-md mr-4 object-cover">
                            <span class="font-medium">${product.name}</span>
                        </td>
                        <td class="py-3 px-6">${product.description}</td>
                        <td class="py-3 px-6 text-center">${product.price}</td>
                        <td class="py-3 px-6 text-center">${product.category}</td>
                        <td class="py-3 px-6 text-center">
                            <button data-product='${JSON.stringify(product)}' class="edit-btn text-yellow-500 hover:text-yellow-700 mr-2"><i class="fas fa-edit"></i></button>
                            <button data-id="${product._id}" class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        } catch (error) { console.error('Lỗi tải sản phẩm:', error); }
    };

    // --- PHẦN 4: XỬ LÝ CÁC SỰ KIỆN ---
    // Sự kiện submit form (Thêm mới hoặc Cập nhật)
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = productIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
        
        const formData = {
            name: document.getElementById('productName').value,
            imageUrl: document.getElementById('imageUrl').value,
            description: document.getElementById('productDescription').value,
            price: document.getElementById('productPrice').value,
            affiliateUrl: document.getElementById('affiliateUrl').value,
            category: document.getElementById('productCategory').value,
        };

        try {
            const response = await fetch(url, { method, headers, body: JSON.stringify(formData) });
            if (!response.ok) throw new Error('Thao tác thất bại');
            closeModal();
            fetchAndRenderProducts(); // Tải lại danh sách sản phẩm
            // showToast('Thao tác thành công!'); // Sẽ thêm hàm này sau
        } catch (error) { console.error('Lỗi khi lưu sản phẩm:', error); alert(error.message); }
    });

    // Sự kiện click vào nút Sửa/Xóa trên bảng
    tableBody.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-btn');
        const deleteButton = e.target.closest('.delete-btn');

        if (editButton) {
            const product = JSON.parse(editButton.dataset.product);
            openModal('edit', product);
        }

        if (deleteButton) {
            const id = deleteButton.dataset.id;
            if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                try {
                    const response = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers });
                    if (!response.ok) throw new Error('Xóa thất bại');
                    fetchAndRenderProducts();
                } catch (error) { console.error('Lỗi khi xóa sản phẩm:', error); alert(error.message); }
            }
        }
    });

    // Tải dữ liệu lần đầu khi trang được mở
    fetchAndRenderProducts();
});