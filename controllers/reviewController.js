const Review = require('../models/Review');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');

/**
 * @desc    Tạo một đánh giá mới cho một bãi xe.
 * @route   POST /api/reviews/:parkingLotId
 * @access  Private
 */
const createParkingLotReview = async (req, res) => {
    const { rating, comment } = req.body;
    const { parkingLotId } = req.params;

    try {
        const parkingLot = await ParkingLot.findById(parkingLotId);
        if (!parkingLot) {
            return res.status(404).json({ message: 'Không tìm thấy bãi xe' });
        }
        
        // Đẳng cấp hơn: Kiểm tra xem người dùng đã từng đặt chỗ và hoàn thành ở bãi này chưa
        const hasCompletedBooking = await Booking.findOne({
            user: req.user._id,
            parkingLot: parkingLotId,
            status: 'completed'
        });
        if (!hasCompletedBooking) {
            return res.status(403).json({ message: 'Bạn phải hoàn thành một lượt đặt chỗ tại đây mới có thể đánh giá.' });
        }

        const alreadyReviewed = await Review.findOne({ user: req.user._id, parkingLot: parkingLotId });
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'Bạn đã đánh giá bãi xe này rồi' });
        }

        const review = new Review({
            rating: Number(rating),
            comment,
            user: req.user._id,
            name: req.user.name,
            parkingLot: parkingLotId,
        });

        const createdReview = await review.save();
        
        // Cập nhật lại rating trung bình cho bãi xe
        const reviews = await Review.find({ parkingLot: parkingLotId });
        parkingLot.numReviews = reviews.length;
        parkingLot.rating = (reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length).toFixed(1);
        
        await parkingLot.save();

        res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá!' });

    } catch (error) {
        console.error("Lỗi khi tạo review:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = { createParkingLotReview };