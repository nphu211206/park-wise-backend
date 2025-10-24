// controllers/reviewController.js (PHIÊN BẢN ĐẲNG CẤP HOÀN THIỆN)

const Review = require('../models/Review');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

/**
 * @desc    Tạo một đánh giá mới cho một bãi xe.
 * @route   POST /api/reviews/:parkingLotId
 * @access  Private
 * @note    Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu.
 */
const createParkingLotReview = async (req, res) => {
    const { rating, comment } = req.body;
    const { parkingLotId } = req.params;
    const userId = req.user._id;

    // Bắt đầu một Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const parkingLot = await ParkingLot.findById(parkingLotId).session(session);
        if (!parkingLot) {
            throw new Error('Không tìm thấy bãi xe');
        }
        
        // 1. (Bùng nổ) Kiểm tra xem user đã hoàn thành booking ở đây chưa
        const hasCompletedBooking = await Booking.findOne({
            user: userId,
            parkingLot: parkingLotId,
            status: 'completed' // Chỉ cho phép review khi đã 'completed'
        }).session(session);
        
        if (!hasCompletedBooking) {
            return res.status(403).json({ message: 'Bạn phải hoàn thành một lượt đặt chỗ tại đây mới có thể đánh giá.' });
        }

        // 2. Kiểm tra xem user đã review bãi này chưa
        const alreadyReviewed = await Review.findOne({
            user: userId,
            parkingLot: parkingLotId
        }).session(session);
        
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'Bạn đã đánh giá bãi xe này rồi.' });
        }

        // 3. Tạo review mới
        const review = new Review({
            rating: Number(rating),
            comment,
            user: userId,
            name: req.user.name, // Lấy tên từ user đã được xác thực
            parkingLot: parkingLotId,
        });

        const createdReview = await review.save({ session });
        
        // 4. (Đẳng cấp) Cập nhật lại rating trung bình và số lượng review của bãi xe
        const reviews = await Review.find({ parkingLot: parkingLotId }).session(session);
        
        parkingLot.numReviews = reviews.length;
        // Tính toán rating trung bình, làm tròn 1 chữ số
        const newRating = (reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length);
        parkingLot.rating = Math.round(newRating * 10) / 10; 
        
        await parkingLot.save({ session });

        // 5. Commit transaction
        await session.commitTransaction();
        
        // Populate thông tin user cho review vừa tạo để trả về frontend
        const populatedReview = await createdReview.populate('user', 'name');

        res.status(201).json(populatedReview); // Trả về review vừa tạo để FE update

    } catch (error) {
        await session.abortTransaction(); // Hủy bỏ mọi thay đổi nếu có lỗi
        console.error("Lỗi khi tạo review (Đã Rollback):", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession(); // Luôn đóng session
    }
};

/**
 * @desc    Lấy tất cả đánh giá của một bãi xe.
 * @route   GET /api/reviews/:parkingLotId
 * @access  Private (Cần login để check canReview)
 */
const getParkingLotReviews = async (req, res) => {
    const { parkingLotId } = req.params;
    const userId = req.user._id;

    try {
        // (Bùng nổ) Dùng Promise.all để thực hiện 3 truy vấn song song
        const [reviews, completedBookings, userReview] = await Promise.all([
            // 1. Lấy danh sách reviews, populate tên user
            Review.find({ parkingLot: parkingLotId })
                .populate('user', 'name') // Chỉ lấy 'name' (và 'avatar' sau này)
                .sort({ createdAt: -1 }), // Sắp xếp mới nhất lên đầu
            
            // 2. Đếm số booking đã hoàn thành của user này tại bãi này
            Booking.find({
                user: userId,
                parkingLot: parkingLotId,
                status: 'completed'
            }).countDocuments(),

            // 3. Kiểm tra xem user này đã review bãi này chưa
            Review.findOne({
                user: userId,
                parkingLot: parkingLotId
            })
        ]);

        // Logic "Đẳng cấp": User có thể review khi:
        // 1. Đã hoàn thành ít nhất 1 booking.
        // 2. Chưa từng review bãi này.
        const canReview = completedBookings > 0 && !userReview;

        res.json({
            reviews: reviews, // Danh sách đánh giá
            canReview: canReview // Quyền được review của user đang xem
        });

    } catch (error) {
        console.error("Lỗi khi lấy reviews:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

/**
 * @desc    Xóa một đánh giá (Admin)
 * @route   DELETE /api/reviews/:id
 * @access  Private/Admin
 */
const deleteReview = async (req, res) => {
    // (Đẳng cấp) Dùng Transaction để xóa review VÀ cập nhật lại rating
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const review = await Review.findById(req.params.id).session(session);
        if (!review) {
            throw new Error('Không tìm thấy đánh giá');
        }

        const parkingLotId = review.parkingLot;
        await review.deleteOne({ session });

        // Cập nhật lại parking lot
        const parkingLot = await ParkingLot.findById(parkingLotId).session(session);
        if (parkingLot) {
            const reviews = await Review.find({ parkingLot: parkingLotId }).session(session);
            parkingLot.numReviews = reviews.length;
            if (reviews.length > 0) {
                const newRating = (reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length);
                parkingLot.rating = Math.round(newRating * 10) / 10;
            } else {
                parkingLot.rating = 0; // Reset nếu không còn review nào
            }
            await parkingLot.save({ session });
        }

        await session.commitTransaction();
        res.json({ message: 'Đã xóa đánh giá thành công' });
        
    } catch (error) {
        await session.abortTransaction();
        console.error("Lỗi khi xóa review:", error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Cập nhật một đánh giá (Admin - ví dụ: ẩn/hiện)
 * @route   PUT /api/reviews/:id
 * @access  Private/Admin
 */
const updateReview = async (req, res) => {
     // TODO: Logic cho Admin sửa/ẩn review
     // (Hiện tại chưa cần thiết cho Giai đoạn 1)
     res.status(501).json({ message: 'Chức năng chưa được triển khai' });
};


module.exports = {
    createParkingLotReview,
    getParkingLotReviews,
    deleteReview,
    updateReview
};