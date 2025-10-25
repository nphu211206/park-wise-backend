// controllers/reviewController.js (PHIÊN BẢN ĐẲNG CẤP HOÀN THIỆN HƠN)

const Review = require('../models/Review');
const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking'); // Đảm bảo đã import Booking model mới
const mongoose = require('mongoose');

/**
 * @desc    Tạo một đánh giá mới cho một bãi xe "Đẳng Cấp".
 * @route   POST /api/reviews/:parkingLotId
 * @access  Private
 * @note    Sử dụng Transaction, kiểm tra booking, cập nhật rating chính xác.
 */
const createParkingLotReview = async (req, res) => {
    const { rating, comment } = req.body;
    const { parkingLotId } = req.params;
    const userId = req.user._id;

    // --- Validation đầu vào ---
    if (!rating || typeof Number(rating) !== 'number' || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ message: 'Vui lòng cung cấp rating hợp lệ (1-5 sao).' });
    }
    // Comment có thể tùy chọn hoặc bắt buộc tùy logic của bạn
    // if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    //     return res.status(400).json({ message: 'Vui lòng nhập nội dung bình luận.' });
    // }
    if (!mongoose.Types.ObjectId.isValid(parkingLotId)) {
         return res.status(400).json({ message: 'ID bãi xe không hợp lệ.' });
    }


    // Bắt đầu một Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- Truy vấn đồng thời để tối ưu ---
        const [parkingLot, hasCompletedBooking, alreadyReviewed] = await Promise.all([
            ParkingLot.findById(parkingLotId).session(session),
            // Đảm bảo Booking model đã được import và đúng tên
            Booking.exists({ // Dùng exists() để nhẹ nhàng hơn findOne()
                user: userId,
                parkingLot: parkingLotId,
                status: 'completed'
            }).session(session),
            Review.exists({
                user: userId,
                parkingLot: parkingLotId
            }).session(session)
        ]);


        if (!parkingLot) {
            throw new Error('Không tìm thấy bãi xe.');
        }

        // 1. (Bùng nổ) Kiểm tra xem user đã hoàn thành booking ở đây chưa
        if (!hasCompletedBooking) {
            console.log(`User ${userId} attempted to review lot ${parkingLotId} without a completed booking.`);
            // Có thể trả về 403 hoặc 400 tùy logic bạn muốn
            return res.status(403).json({ message: 'Bạn cần hoàn thành một lượt đỗ xe tại đây trước khi đánh giá.' });
        }

        // 2. Kiểm tra xem user đã review bãi này chưa
        if (alreadyReviewed) {
             console.log(`User ${userId} attempted to review lot ${parkingLotId} again.`);
            return res.status(400).json({ message: 'Bạn đã đánh giá bãi xe này rồi.' });
        }

        // 3. Tạo review mới
        const review = new Review({
            rating: Number(rating),
            comment: comment ? comment.trim() : '', // Trim comment hoặc để trống nếu không có
            user: userId,
            name: req.user.name, // Lấy tên từ user đã được xác thực (có sẵn từ middleware 'protect')
            parkingLot: parkingLotId,
        });

        // Lưu review vào DB (trong transaction)
        const createdReview = await review.save({ session });
        console.log(`Review ${createdReview._id} created successfully.`);


        // 4. (Đẳng cấp) Cập nhật lại rating trung bình và số lượng review của bãi xe
        // Sử dụng $group aggregation pipeline để tính toán hiệu quả hơn trên DB
        const stats = await Review.aggregate([
          { $match: { parkingLot: new mongoose.Types.ObjectId(parkingLotId) } }, // Đảm bảo match đúng ObjectId
          { $group: {
              _id: '$parkingLot',
              numReviews: { $sum: 1 },
              avgRating: { $avg: '$rating' }
          }}
        ]).session(session);


        if (stats.length > 0) {
            parkingLot.numReviews = stats[0].numReviews;
            // Làm tròn đến 1 chữ số thập phân
            parkingLot.rating = Math.round(stats[0].avgRating * 10) / 10;
        } else {
             // Trường hợp không có review nào (sau khi xóa chẳng hạn)
             // Hoặc đây là review đầu tiên
             parkingLot.numReviews = 1;
             parkingLot.rating = Number(rating);
        }

        // (Bùng nổ) Đánh dấu là booking đã được review (nếu cần logic này)
        // Tìm booking gần nhất đã hoàn thành và chưa được review
        /*
        const latestCompletedBooking = await Booking.findOneAndUpdate(
            { user: userId, parkingLot: parkingLotId, status: 'completed', hasReview: false },
            { $set: { hasReview: true } },
            { sort: { createdAt: -1 }, session } // Cập nhật booking mới nhất
        );
        if (latestCompletedBooking) {
             console.log(`Marked booking ${latestCompletedBooking._id} as reviewed.`);
        } else {
             console.warn(`Could not find a completed, unreviewed booking for user ${userId} at lot ${parkingLotId} to mark.`);
             // Không cần throw lỗi ở đây, chỉ là không đánh dấu được booking nào
        }
        */

        // Lưu thay đổi của bãi xe (trong transaction)
        await parkingLot.save({ session });
         console.log(`ParkingLot ${parkingLotId} stats updated: numReviews=${parkingLot.numReviews}, rating=${parkingLot.rating}`);


        // 5. Commit transaction
        await session.commitTransaction();
        console.log(`Transaction committed for review creation ${createdReview._id}.`);

        // Populate thông tin user cho review vừa tạo để trả về frontend (KHÔNG cần session nữa)
        // Dùng lean() để kết quả nhẹ hơn nếu chỉ cần dữ liệu thô
        const populatedReview = await Review.findById(createdReview._id).populate('user', 'name').lean();

        res.status(201).json(populatedReview); // Trả về review vừa tạo để FE update

    } catch (error) {
        await session.abortTransaction(); // Hủy bỏ mọi thay đổi nếu có lỗi
        console.error("Lỗi khi tạo review (Đã Rollback):", error);
        // Trả về lỗi cụ thể hơn nếu có thể
        res.status(error.name === 'ValidationError' ? 400 : 500)
           .json({ message: error.message || 'Lỗi server khi tạo đánh giá.' });
    } finally {
        session.endSession(); // Luôn đóng session
    }
};

/**
 * @desc    Lấy tất cả đánh giá của một bãi xe và quyền review của user.
 * @route   GET /api/reviews/:parkingLotId
 * @access  Private
 */
const getParkingLotReviews = async (req, res) => {
    const { parkingLotId } = req.params;
    const userId = req.user._id; // Lấy từ middleware protect

    if (!mongoose.Types.ObjectId.isValid(parkingLotId)) {
        return res.status(400).json({ message: 'ID bãi xe không hợp lệ.' });
    }

    try {
        // (Bùng nổ) Dùng Promise.all để thực hiện 3 truy vấn song song, tối ưu tốc độ
        const [reviews, hasCompletedBooking, userHasReviewed] = await Promise.all([
            // 1. Lấy danh sách reviews, populate tên user, sắp xếp mới nhất lên đầu
            Review.find({ parkingLot: parkingLotId })
                .populate('user', 'name') // Chỉ lấy 'name', sau này có thể thêm 'avatarUrl'
                .sort({ createdAt: -1 }) // Sắp xếp mới nhất lên đầu
                .lean(), // Dùng lean() để kết quả nhẹ hơn, nhanh hơn

            // 2. Kiểm tra user này đã hoàn thành booking tại đây chưa?
            Booking.exists({
                user: userId,
                parkingLot: parkingLotId,
                status: 'completed'
                // Có thể thêm điều kiện thời gian nếu muốn giới hạn review trong 1 khoảng tgian sau khi hoàn thành
                // completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Ví dụ: trong vòng 30 ngày
            }),

            // 3. Kiểm tra xem user này đã review bãi này chưa
            Review.exists({
                user: userId,
                parkingLot: parkingLotId
            })
        ]);

        // Logic "Đẳng cấp": User có thể review khi:
        // 1. Đã hoàn thành ít nhất 1 booking.
        // 2. Chưa từng review bãi này.
        const canReview = !!hasCompletedBooking && !userHasReviewed;

        console.log(`Reviews for lot ${parkingLotId} fetched. User ${userId} canReview: ${canReview}`);

        res.json({
            reviews: reviews,     // Danh sách đánh giá
            canReview: canReview, // Quyền được review của user đang xem
            totalReviews: reviews.length // Có thể trả về tổng số để tiện phân trang sau này
        });

    } catch (error) {
        console.error(`Lỗi khi lấy reviews cho bãi xe ${parkingLotId}:`, error);
        res.status(500).json({ message: 'Lỗi server khi lấy đánh giá.', error: error.message });
    }
};

// --- Các hàm Delete/Update giữ nguyên như trước ---
/**
 * @desc    Xóa một đánh giá (Admin)
 * @route   DELETE /api/reviews/:id
 * @access  Private/Admin
 */
const deleteReview = async (req, res) => {
    // (Đẳng cấp) Dùng Transaction để xóa review VÀ cập nhật lại rating
    const { id: reviewId } = req.params;
     if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ message: 'ID đánh giá không hợp lệ.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const review = await Review.findById(reviewId).session(session);
        if (!review) {
            throw new Error('Không tìm thấy đánh giá');
        }

        const parkingLotId = review.parkingLot; // Lấy ID bãi xe trước khi xóa review
        await review.deleteOne({ session }); // Xóa review
        console.log(`Review ${reviewId} deleted.`);

        // Cập nhật lại parking lot
        const parkingLot = await ParkingLot.findById(parkingLotId).session(session);
        if (parkingLot) {
            // Tính lại bằng aggregation pipeline
             const stats = await Review.aggregate([
              { $match: { parkingLot: new mongoose.Types.ObjectId(parkingLotId) } },
              { $group: {
                  _id: '$parkingLot',
                  numReviews: { $sum: 1 },
                  avgRating: { $avg: '$rating' }
              }}
            ]).session(session);

            if (stats.length > 0) {
                 parkingLot.numReviews = stats[0].numReviews;
                 parkingLot.rating = Math.round(stats[0].avgRating * 10) / 10;
            } else {
                 parkingLot.numReviews = 0;
                 parkingLot.rating = 0; // Reset nếu không còn review nào
            }
            await parkingLot.save({ session });
            console.log(`ParkingLot ${parkingLotId} stats updated after review deletion.`);
        } else {
             console.warn(`ParkingLot ${parkingLotId} not found when updating stats after review deletion.`);
        }


        await session.commitTransaction();
        res.json({ message: 'Đã xóa đánh giá thành công' });

    } catch (error) {
        await session.abortTransaction();
        console.error("Lỗi khi xóa review (Đã Rollback):", error);
        res.status(500).json({ message: error.message || 'Lỗi server khi xóa đánh giá.' });
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
     // TODO: Logic cho Admin sửa/ẩn review (Ví dụ: thêm trường isHidden: Boolean)
     // const { id } = req.params;
     // const { isHidden, updatedComment } = req.body;
     // const review = await Review.findById(id);
     // if (!review) return res.status(404)...
     // if (isHidden !== undefined) review.isHidden = isHidden;
     // if (updatedComment) review.comment = updatedComment;
     // await review.save();
     // res.json(review);
     res.status(501).json({ message: 'Chức năng cập nhật review chưa được triển khai' });
};


module.exports = {
    createParkingLotReview,
    getParkingLotReviews,
    deleteReview,
    updateReview
};