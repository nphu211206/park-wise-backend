

const axios = require('axios');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');

/**
 * @desc    Tạo yêu cầu thanh toán và trả về payUrl cho Front-end.
 * @route   POST /api/payments/create-momo-payment
 * @access  Private
 */
const createMoMoPayment = async (req, res) => {
    const { bookingId } = req.body;
    try {
        const booking = await Booking.findById(bookingId).populate('parkingLot');
        if (!booking || booking.isPaid) {
            return res.status(400).json({ message: 'Đơn đặt chỗ không hợp lệ hoặc đã thanh toán.' });
        }

        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const requestId = partnerCode + new Date().getTime();
        const orderId = booking._id.toString(); // Dùng ID của booking làm orderId để dễ truy vấn
        const orderInfo = `Thanh toán đặt chỗ tại ${booking.parkingLot.name}`;
        // QUAN TRỌNG: URL này phải là địa chỉ public mà MoMo có thể truy cập
        const redirectUrl = `http://localhost:5000/booking-success.html`;
        const ipnUrl = `https://your-public-ngrok-url.io/api/payments/momo-ipn`; // Sẽ thay bằng ngrok để test
        const amount = booking.totalPrice.toString();
        const requestType = "captureWallet";
        const extraData = "";

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

        const requestBody = {
            partnerCode, accessKey, requestId, amount, orderId, orderInfo,
            redirectUrl, ipnUrl, extraData, requestType, signature, lang: 'vi'
        };

        const momoResponse = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody);
        
        res.json({ payUrl: momoResponse.data.payUrl });

    } catch (error) {
        console.error("Lỗi khi tạo thanh toán MoMo:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Lỗi server khi tạo thanh toán" });
    }
};

/**
 * @desc    Lắng nghe tín hiệu IPN (Webhook) từ server MoMo.
 * @route   POST /api/payments/momo-ipn
 * @access  Public (nhưng được bảo vệ bằng chữ ký)
 */
const handleMoMoIPN = async (req, res) => {
    const {
        partnerCode, orderId, requestId, amount, orderInfo, orderType,
        transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.body;
    
    // --- BƯỚC 1: XÁC THỰC CHỮ KÝ - BẢO MẬT TUYỆT ĐỐI ---
    const secretKey = process.env.MOMO_SECRET_KEY;
    const rawSignature = `partnerCode=${partnerCode}&orderId=${orderId}&requestId=${requestId}&amount=${amount}&orderInfo=${orderInfo}&orderType=${orderType}&transId=${transId}&message=${message}&resultCode=${resultCode}&payType=${payType}&responseTime=${responseTime}&extraData=${extraData}`;
    
    const calculatedSignature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    if (signature !== calculatedSignature) {
        console.error("IPN Warning: Chữ ký không hợp lệ!");
        return res.status(400).json({ message: 'Invalid signature' });
    }

    // --- BƯỚC 2: XỬ LÝ LOGIC KHI THANH TOÁN THÀNH CÔNG ---
    try {
        if (resultCode === 0) { // Giao dịch thành công
            const booking = await Booking.findById(orderId);
            if (booking && !booking.isPaid) {
                // Cập nhật trạng thái đơn hàng
                booking.isPaid = true;
                booking.paidAt = new Date();
                booking.status = 'confirmed'; // Chuyển từ 'pending' sang 'confirmed'
                booking.paymentResult = {
                    id: transId,
                    status: message,
                    update_time: responseTime,
                };
                await booking.save();
                console.log(`[IPN] Đã xác nhận thanh toán cho đơn hàng ${orderId}`);

                // Trừ số chỗ trống của bãi xe (Logic quan trọng)
                const parkingLot = await ParkingLot.findById(booking.parkingLot);
                if (parkingLot) {
                    parkingLot.availableSpots -= 1;
                    const updatedParkingLot = await parkingLot.save();
                    
                    // Gửi tín hiệu real-time cập nhật
                    const io = req.app.get('socketio');
                    if (io) {
                        io.emit('parkingLotUpdate', updatedParkingLot);
                        console.log(`[IPN] Đã gửi cập nhật real-time cho bãi xe ${parkingLot.name}`);
                    }
                }
            }
        } else {
            // Xử lý khi giao dịch thất bại
            console.log(`[IPN] Giao dịch ${orderId} thất bại hoặc bị hủy.`);
            const booking = await Booking.findById(orderId);
            if (booking) {
                booking.status = 'cancelled';
                await booking.save();
            }
        }
        // Phản hồi cho MoMo biết đã nhận được tin
        res.status(204).send();
    } catch (error) {
        console.error("[IPN] Lỗi khi xử lý:", error);
        res.status(500).send();
    }
};

module.exports = { createMoMoPayment, handleMoMoIPN };