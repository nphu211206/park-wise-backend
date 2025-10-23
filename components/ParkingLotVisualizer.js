// components/ParkingLotVisualizer.js (PHIÊN BẢN ĐẲNG CẤP HOÀN THIỆN)
// Component React (dùng trong Next.js) + Framer Motion + Tailwind
// Kết nối với Backend "Đẳng cấp" (Slot-based)

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// Giả lập thư viện FontAwesome (trong React)
// Bạn cần cài đặt: npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faTools, faMotorcycle, faChargingStation } from '@fortawesome/free-solid-svg-icons';

// --- (Đẳng cấp) Helper Component cho từng Ô (Slot) ---
const ParkingSlot = ({ slot, onSelect, isSelected }) => {
    
    // Logic chọn màu sắc "đẳng cấp"
    const getSlotStyle = (status) => {
        switch (status) {
            case 'available':
                return 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-500/30 cursor-pointer';
            case 'occupied':
                return 'bg-red-700/30 border-red-800 text-red-400 cursor-not-allowed';
            case 'reserved':
                return 'bg-yellow-500/30 border-yellow-700 text-yellow-300 cursor-not-allowed';
            case 'maintenance':
                return 'bg-gray-600/30 border-gray-700 text-gray-500 cursor-not-allowed';
            default:
                return 'bg-gray-800 border-gray-900';
        }
    };

    // Logic chọn icon "bùng nổ"
    const getIcon = (vehicleType, status) => {
        if (status === 'maintenance') return <FontAwesomeIcon icon={faTools} />;
        if (status === 'occupied') return <FontAwesomeIcon icon={faCar} className="text-white/70" />;
        
        switch (vehicleType) {
            case 'motorbike': return <FontAwesomeIcon icon={faMotorcycle} />;
            case 'ev_car': return <FontAwesomeIcon icon={faChargingStation} />;
            case 'suv':
            case 'car_7_seats':
            case 'car_4_seats':
            default:
                return <span className="text-xs font-bold">{slot.identifier}</span>;
        }
    };

    // Hiệu ứng cho Framer Motion
    const slotVariants = {
        initial: { opacity: 0, scale: 0.7 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.7 },
        hover: { scale: 1.05, boxShadow: '0px 0px 15px rgba(59, 130, 246, 0.5)' } // Hiệu ứng "glow"
    };

    return (
        <motion.div
            layout // Hiệu ứng mượt mà khi state thay đổi
            variants={slotVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover={slot.status === 'available' ? "hover" : ""}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => slot.status === 'available' && onSelect(slot)}
            className={`
                relative w-28 h-20 rounded-lg border-2
                flex items-center justify-center 
                transition-all duration-200
                ${getSlotStyle(slot.status)}
                ${isSelected ? 'ring-4 ring-offset-2 ring-offset-bg ring-brand-light' : ''}
            `}
            title={`Ô ${slot.identifier} - ${slot.status}`}
        >
            <div className="flex flex-col items-center justify-center">
                {getIcon(slot.vehicleType, slot.status)}
                {slot.status !== 'available' && (
                    <span className="text-xs font-bold mt-1">{slot.identifier}</span>
                )}
            </div>
        </motion.div>
    );
};

// --- (Đẳng cấp) Component Chính: Trình hiển thị Bãi xe ---
const ParkingLotVisualizer = ({ parkingLotId, onSlotSelect, userVehicleType }) => {
    // State cho toàn bộ bãi xe
    const [parkingLot, setParkingLot] = useState(null);
    // State cho ô đang được chọn
    const [selectedSlot, setSelectedSlot] = useState(null);
    // State cho lỗi
    const [error, setError] = useState(null);
    // State cho việc tải
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const token = /* Lấy token từ Context hoặc localStorage */ localStorage.getItem('userToken');

    useEffect(() => {
        if (!parkingLotId) return;

        // --- Bước 1: Fetch dữ liệu chi tiết bãi xe (gồm TẤT CẢ slots) ---
        const fetchLotDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/parking-lots/${parkingLotId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    throw new Error(`Không thể tải sơ đồ bãi xe (Lỗi ${response.status})`);
                }
                
                const data = await response.json();
                setParkingLot(data);
                
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLotDetails();

        // --- Bước 2: Kết nối Socket.IO để nhận update REAL-TIME ---
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
        
        // (Đẳng cấp) Tham gia "phòng" của bãi xe này
        socket.emit('joinLotRoom', parkingLotId);
        
        // Lắng nghe sự kiện 'slotUpdate' (từ Backend "Đẳng cấp")
        socket.on('slotUpdate', (updatedSlot) => {
            // Chỉ cập nhật nếu slot đó thuộc bãi xe này
            if (updatedSlot.parkingLotId === parkingLotId) {
                setParkingLot(prevLot => {
                    if (!prevLot) return null;
                    
                    const newSlots = prevLot.slots.map(slot => 
                        slot._id === updatedSlot._id 
                            ? { ...slot, status: updatedSlot.status } // Cập nhật trạng thái
                            : slot
                    );
                    
                    return { ...prevLot, slots: newSlots };
                });
            }
        });

        // Cleanup: Rời phòng và ngắt kết nối khi component bị hủy
        return () => {
            socket.emit('leaveLotRoom', parkingLotId);
            socket.disconnect();
        };

    }, [parkingLotId, token, API_URL]);

    // Xử lý khi người dùng click chọn 1 ô
    const handleSelectSlot = (slot) => {
        // (Bùng nổ) Kiểm tra loại xe
        if (userVehicleType && slot.vehicleType !== 'any' && slot.vehicleType !== userVehicleType) {
            alert(`Ô này chỉ dành cho loại xe ${slot.vehicleType}. Xe của bạn là ${userVehicleType}.`);
            return;
        }

        setSelectedSlot(slot);
        onSlotSelect(slot); // Báo cho component cha (trang Booking) biết
    };

    // --- Render Giao diện ---
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 card-premium p-6">
                <span className="text-text-secondary animate-pulse">
                    <i className="fas fa-spinner fa-spin mr-2"></i> Đang tải sơ đồ bãi xe...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64 card-premium p-6 bg-red-900/50 border-danger">
                <span className="text-red-300">{error}</span>
            </div>
        );
    }

    if (!parkingLot) return null;

    // (Bùng nổ) Tính toán thống kê nhanh
    const stats = parkingLot.slots.reduce((acc, slot) => {
        acc[slot.status] = (acc[slot.status] || 0) + 1;
        return acc;
    }, { available: 0, occupied: 0, reserved: 0, maintenance: 0 });

    return (
        <motion.div 
            className="card-premium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-bold text-text-primary mb-2">{parkingLot.name}</h2>
                <p className="text-sm text-text-secondary mb-4">{parkingLot.address}</p>
                
                {/* Thanh thống kê Real-time */}
                <div className="flex space-x-4 text-center">
                    <div className="flex-1">
                        <span className="block text-2xl font-bold text-green-400">{stats.available}</span>
                        <span className="text-xs text-text-secondary">TRỐNG</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-2xl font-bold text-red-400">{stats.occupied}</span>
                        <span className="text-xs text-text-secondary">ĐÃ CHIẾM</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-2xl font-bold text-yellow-400">{stats.reserved}</span>
                        <span className="text-xs text-text-secondary">ĐÃ ĐẶT</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-2xl font-bold text-gray-500">{stats.maintenance}</span>
                        <span className="text-xs text-text-secondary">BẢO TRÌ</span>
                    </div>
                </div>
            </div>
            
            {/* Khu vực hiển thị 2D "Đẳng cấp" */}
            <div className="bg-bg p-4 md:p-8" style={{ minHeight: '300px' }}>
                <div className="flex flex-wrap gap-3 justify-center">
                    <AnimatePresence>
                        {parkingLot.slots
                            .sort((a, b) => a.identifier.localeCompare(b.identifier)) // Sắp xếp A-01, A-02...
                            .map(slot => (
                                <ParkingSlot 
                                    key={slot._id} 
                                    slot={slot} 
                                    onSelect={handleSelectSlot}
                                    isSelected={selectedSlot?._id === slot._id}
                                />
                            ))
                        }
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default ParkingLotVisualizer;