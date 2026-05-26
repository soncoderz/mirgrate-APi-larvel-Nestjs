# Quy tắc vàng khi Migration (Rules)

Trong suốt quá trình migration, bạn cần tuân thủ nghiêm ngặt các quy tắc dưới đây để đảm bảo hệ thống NestJS hoạt động đồng bộ và thay thế hoàn hảo cho Laravel:

## 1. Tính tương thích giao diện API (API Compatibility)
- **Đường dẫn (Path) & Method**: Giữ nguyên cấu trúc route và Http Method (ví dụ: `POST /api/v1/updateUser`). Không thay đổi chữ hoa/thường hoặc tên tham số.
- **Request Body & Response JSON**: Cấu trúc dữ liệu gửi lên và kết quả JSON trả về phải khớp 100% với Laravel (kể cả các key báo lỗi hoặc dữ liệu phân trang `meta`, `links`, `current_page`).

## 2. Quy tắc An toàn Cơ sở dữ liệu (Database Safety)
- **Không tự động đồng bộ (No `synchronize: true`)**: Cấu hình TypeORM cho tất cả các connection phải đặt `synchronize: false` trên môi trường phát triển và sản xuất. Tránh việc TypeORM tự ý sửa đổi/xóa cấu trúc bảng hiện tại trong DB.
- **Chống SQL Injection**: Đối với mọi câu Raw SQL, bắt buộc dùng Prepared Statements (dùng ký tự `?` và mảng truyền tham số). Tuyệt đối không cộng chuỗi SQL trực tiếp với biến người dùng gửi lên.

## 3. Quy tắc Xác thực & Phân quyền (Security)
- **JWT Key & Algorithm**: Dùng chung khoá bí mật `JWT_SECRET` và thuật toán ký (`HS256`) từ file `.env` của Laravel để đảm bảo token phát hành chéo dùng được cho nhau.
- **Custom Token Header**: Giữ nguyên cơ chế bypass hoặc xác thực token bằng `x-custom-token` cho các route `/connector/*` để các tổng đài Asterisk hiện tại không bị gián đoạn.

## 4. Xử lý lỗi & Định dạng Phản hồi (Error Handling)
- **Http Status Codes**: Trả về đúng Http Status Code như Laravel (ví dụ: Validation error trả về `406 Invalid parameters` thay vì mặc định `400 Bad Request` của NestJS).
- **Global Exception Filter**: Viết Filter chung để định dạng lại toàn bộ lỗi hệ thống về định dạng chuẩn mà client (Frontend/Mobile app) đang mong đợi.

---

## 5. Câu hỏi Ôn tập & Tự đánh giá (Rules Review Questions)
1. **Database Safety**: Tại sao quy tắc `synchronize: false` trong cấu hình TypeORM là bắt buộc đối với một dự án migration? Điều gì sẽ xảy ra nếu vô tình kích hoạt `synchronize: true` trên cơ sở dữ liệu đã có sẵn dữ liệu của khách hàng?
2. **SQL Injection**: Hãy viết ví dụ một đoạn code thực hiện Raw SQL trong NestJS vi phạm quy tắc an toàn (bị SQL Injection) và sửa lại cho đúng quy tắc sử dụng Prepared Statement.
3. **API Compatibility**: Nếu Laravel trả về cấu trúc lỗi Validation với mã HTTP `406 Not Acceptable`, nhưng NestJS mặc định trả về `400 Bad Request`, chúng ta cần làm gì ở tầng ứng dụng NestJS để đồng bộ hành vi này mà không sửa đổi code client?
4. **Security**: Tại sao việc đồng bộ `JWT_SECRET` và thuật toán ký (`HS256`) giữa Laravel và NestJS lại là quy tắc bắt buộc khi chạy song song hai hệ thống?
