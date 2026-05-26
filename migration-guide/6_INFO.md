# Thông tin kỹ thuật cần thu thập từ Laravel (Migration Info Checklist)

Để thực hiện migration thành công, dưới đây là danh sách các thông tin cấu hình, tham số bí mật và logic đặc thù cần trích xuất trực tiếp từ dự án Laravel `masvn-contactpopup-backend`:

---

## 1. Các biến cấu hình hệ thống (.env)

| Tham số trong Laravel | Vai trò trong NestJS | Giá trị cần lấy |
| :--- | :--- | :--- |
| `JWT_SECRET` | Khóa bí mật dùng để ký và verify JWT token. | Lấy từ `.env` của Laravel |
| `JWT_ALGO` | Thuật toán mã hóa JWT (mặc định: `HS256`). | Lấy từ `.env` của Laravel |
| `DB_DATABASE` | Database chính của ứng dụng (MAIN_DB). | Lấy từ `.env` của Laravel |
| `DB_DATABASE_VOICE` | Database chứa log cuộc gọi (VOICE_DB). | Lấy từ `.env` của Laravel |
| `DB_DATABASE_PBX` | Database cấu hình tổng đài (PBX_DB). | Lấy từ `.env` của Laravel |

---

## 2. Các tham số bí mật trong Code Logic

### A. Chuỗi muối mã hóa Extension Password (PBX Integration)
- Trong `JTController.php` (hàm `getSecretExtension` và `resetSecretExtension`), mật khẩu Extension khi đồng bộ sang tổng đài được mã hóa 2 lớp Base64 kết hợp chuỗi muối:
  ```php
  base64_encode(base64_encode($password) . 'M1T3K')
  ```
- **Thông tin cần đồng bộ**: Sử dụng đúng chuỗi muối `'M1T3K'` và quy trình mã hóa này ở `asterisk.service.ts` trên NestJS.

### B. Logic Phân mảnh Bảng CDR theo tháng
- Trong `CdrController.php` và `CdrModel.php`, hệ thống xác định bảng đích dựa trên thời gian bắt đầu lọc (`startDate`):
  - Nếu `startDate` thuộc tháng hiện tại -> Truy vấn bảng `cdr`.
  - Nếu `startDate` thuộc tháng cũ -> Truy vấn bảng `cdr_monthly`.
- **Thông tin cần đồng bộ**: Chuyển đổi logic so sánh tháng này vào hàm `cdrTable()` trong `cdr.service.ts` để sinh tên bảng chính xác khi chạy raw SQL.

---

## 3. Cấu hình xác thực API Connector (External Systems)
- Các route `/connector/*` sử dụng middleware xác thực kép `jwt.or.header` trong Laravel (`JwtOrHeader.php`):
  - Cho phép truy cập nếu có JWT token.
  - HOẶC cho phép nếu header `X-Custom-Token` khớp với giá trị token được cấu hình ở server.
- **Thông tin cần đồng bộ**: Sử dụng đúng tên header `x-custom-token` và logic kiểm tra này trong Guard `JwtOrHeaderGuard` của NestJS.

---

## 4. Danh sách các bảng MySQL cần Import (Schema & Data)
Trước khi chạy dự án NestJS local, cần import dữ liệu từ tệp SQL của Laravel vào MySQL local:
1. `db_contactpopup_data.sql` -> File dump cơ sở dữ liệu mẫu.
2. Đảm bảo cấu trúc các bảng chính như `users`, `groups`, `customers`, `cdr`, `queue_log` khớp với thực tế chạy của Laravel.
