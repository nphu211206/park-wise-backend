import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Cấu hình proxy để chuyển tiếp các yêu cầu API đến server backend
    proxy: {
      // Bất kỳ yêu cầu nào bắt đầu bằng '/api' 
      // sẽ được tự động chuyển đến server backend đang chạy ở cổng 5000
      '/api': {
        target: 'http://localhost:5000', // Địa chỉ backend của bạn
        changeOrigin: true,
      }
    }
  }
})