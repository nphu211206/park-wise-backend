/**
 * Tính toán giá động cho một bãi xe dựa trên các yếu tố thời gian thực.
 * @param {object} lot - Đối tượng Mongoose document của một bãi xe (ParkingLot).
 * @returns {number} - Giá đã được điều chỉnh và làm tròn.
 */
function calculateDynamicPrice(lot) {
    // Kiểm tra đầu vào để đảm bảo hệ thống không bị crash
    if (!lot || typeof lot.basePrice !== 'number') {
        console.error("Invalid parking lot object passed to calculateDynamicPrice");
        return 0; // Trả về 0 nếu dữ liệu đầu vào không hợp lệ
    }

    let dynamicPrice = lot.basePrice;
    const now = new Date();
    // Lấy giờ hiện tại theo múi giờ của server (cần cấu hình múi giờ server cho chính xác)
    const hour = now.getHours();

    // === QUY TẮC 1: ĐIỀU CHỈNH GIÁ THEO GIỜ CAO ĐIỂM ===
    // Giả định giờ cao điểm là 7-9h sáng và 17-19h chiều.
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        dynamicPrice *= 1.2; // Tăng giá 20%
    }

    // === QUY TẮC 2: ĐIỀU CHỈNH GIÁ THEO TỶ LỆ LẤP ĐẦY ===
    // Tỷ lệ càng cao, giá càng tăng, phản ánh quy luật cung-cầu.
    if (lot.totalSpots > 0) {
        const occupancyRate = (lot.totalSpots - lot.availableSpots) / lot.totalSpots;
        
        if (occupancyRate > 0.8) { // Nếu bãi xe đã đầy hơn 80%
            dynamicPrice *= 1.3; // Tăng giá 30%
        } else if (occupancyRate > 0.5) { // Nếu bãi xe đã đầy hơn 50%
            dynamicPrice *= 1.1; // Tăng giá 10%
        }
    }

    // === QUY TẮC 3: ĐIỀU CHỈNH GIÁ THEO CHẤT LƯỢNG (ĐÁNH GIÁ CỦA NGƯỜI DÙNG) ===
    // Bãi xe được đánh giá cao hơn xứng đáng có giá cao hơn.
    if (lot.rating > 4.5 && lot.numReviews > 10) { // Yêu cầu có trên 10 lượt đánh giá để khách quan
        dynamicPrice *= 1.1; // Tăng giá 10% cho bãi xe chất lượng "vàng"
    } else if (lot.rating > 0 && lot.rating < 3 && lot.numReviews > 5) { // Yêu cầu có trên 5 lượt đánh giá
        dynamicPrice *= 0.9; // Giảm giá 10% cho bãi xe chất lượng kém để thu hút người dùng
    }

    // === BƯỚC CUỐI CÙNG: LÀM TRÒN ===
    // Làm tròn giá đến hàng nghìn gần nhất để dễ thanh toán (ví dụ: 16,789 -> 17,000)
    return Math.round(dynamicPrice / 1000) * 1000;
}

module.exports = { calculateDynamicPrice };