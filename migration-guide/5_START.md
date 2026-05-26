# Hướng dẫn Bắt đầu (Start Guide)

Hãy làm theo các bước dưới đây để chuẩn bị môi trường và chạy thử dự án NestJS phục vụ việc migration:

## 1. Thiết lập Biến môi trường (.env)
Sao chép tệp `.env.example` thành tệp `.env` trong thư mục gốc của dự án NestJS `masvn-contactpopup-nestjs` và điền đầy đủ các cấu hình kết nối DB tương ứng:

```ini
PORT=3000
NODE_ENV=development

# JWT CONFIG
JWT_SECRET=go5ZVUFiJLQhMWqqDIZX0cp0p2EkerUaIM16oSGGxwIZr6TRO4RRHgyekPxMbUGm
JWT_ALGO=HS256
JWT_ALLOW_UNAUTHENTICATED=false

# DEFAULT DATABASE CONFIG (MAIN DB)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=midesk_contactpopup
DB_USERNAME=root
DB_PASSWORD=

# VOICE DATABASE CONFIG (VOICE DB)
DB_CONNECTION_VOICE=mysql
DB_HOST_VOICE=127.0.0.1
DB_PORT_VOICE=3306
DB_DATABASE_VOICE=midesk_contactpopup
DB_USERNAME_VOICE=root
DB_PASSWORD_VOICE=

# PBX DATABASE CONFIG (PBX DB)
DB_CONNECTION_PBX=mysql
DB_HOST_PBX=127.0.0.1
DB_PORT_PBX=3306
DB_DATABASE_PBX=midesk_contactpopup
DB_USERNAME_PBX=root
DB_PASSWORD_PBX=

# CONNECTOR CONFIG
CONNECTOR_TOKEN=some-secret-token-key-for-asterisk
CONNECTOR_ALLOW_UNAUTHENTICATED=true
```

---

## 2. Cài đặt các gói phụ thuộc (Dependencies)
Mở terminal và chạy lệnh cài đặt thư viện cần thiết:
```powershell
npm install
```

---

## 3. Chạy Server ở chế độ Phát triển (Dev Mode)
Chạy lệnh khởi động dự án NestJS với tính năng tự động reload khi sửa code (Watch Mode):
```powershell
npm run start:dev
```
Nếu dự án khởi chạy thành công, bạn sẽ nhận được thông báo các route đang được nạp vào bộ định tuyến Express.

---

## 4. Kiểm thử Tài liệu API (Swagger UI)
Khi dự án đang chạy, hãy mở trình duyệt và truy cập địa chỉ sau để xem tài liệu API tự động sinh:
```text
http://localhost:3000/api-docs
```
Swagger UI cho phép bạn gọi test trực tiếp các API mà không cần dùng đến các phần mềm như Postman trong quá trình viết code kiểm thử.

---

## 5. Câu hỏi Ôn tập & Tự đánh giá (Start Review Questions)
1. **Database Verification**: Làm thế nào bạn biết chắc chắn rằng ứng dụng NestJS đã kết nối thành công đến cả 3 database khi chạy lệnh khởi động? (Gợi ý: Theo dõi thông báo khởi tạo TypeORM trong terminal).
2. **Watch Mode**: Lệnh `npm run start:dev` sử dụng watch mode mang lại lợi ích gì cho lập trình viên trong quá trình phát triển và kiểm thử code trực tiếp so với việc chạy `npm run start` thông thường?
3. **Swagger JWT Testing**: Làm thế nào để cấu hình và sử dụng JWT Bearer Token trực tiếp trên giao diện Swagger UI để gọi thử nghiệm các API yêu cầu xác thực đăng nhập (các API được bảo vệ bởi `JwtAuthGuard`)?
4. **Port Collision**: Nếu gặp lỗi cổng kết nối `Port 3000 is already in use` khi khởi động dự án NestJS (ví dụ do cổng 3000 đang được dùng bởi ứng dụng khác), bạn cần thay đổi tham số cấu hình nào trong file `.env` và tệp `main.ts`?
