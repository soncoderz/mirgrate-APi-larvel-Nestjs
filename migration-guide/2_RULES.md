# Quy tắc vàng khi Migration (Rules)

## 0. Quyết định kiến trúc mới từ 2026-05-27
- **Không còn bắt buộc giữ response JSON/HTTP status giống Laravel 100%**. Laravel chỉ còn là baseline để so sánh nghiệp vụ đúng/sai, dữ liệu tạo/sửa/xóa đúng hay không, và các side effect DB chính.
- **Route và request contract vẫn ưu tiên giữ ổn định** để frontend/Postman hiện tại không phải đổi quá nhiều, nhưng response/error mới được phép theo chuẩn NestJS.
- **Database access mới phải dùng TypeORM** với `synchronize: false`. `DatabaseService`/`mysql2` chỉ được giữ tạm cho endpoint legacy chưa refactor hoặc query báo cáo quá phức tạp cần chuyển từng bước.
- **Validation mới phải dùng Zod** qua `ZodValidationPipe`. Không tạo thêm DTO `class-validator` cho endpoint mới/refactor.
- **Exception/response mới theo chuẩn NestJS**: dùng `BadRequestException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`, `Created`, `Ok`... thay vì trả helper body kiểu Laravel, trừ endpoint legacy chưa refactor.
- **Thông báo mới phải dùng tiếng Việt có dấu**. Nếu endpoint legacy còn message cũ thì sẽ đổi khi endpoint đó được refactor sang Zod/NestJS chuẩn.

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

## 5. Quy tắc Ngôn ngữ & Tuân thủ yêu cầu người dùng
- **Thông báo phải dùng tiếng Việt có dấu**: Mọi message/thông báo do agent tạo mới trong code, tài liệu, checklist, ghi chú migration, final response hoặc status update phải dùng tiếng Việt có dấu, rõ nghĩa và đúng ngữ cảnh.
- **Ngoại lệ API compatibility**: Nếu Laravel hiện tại trả về đúng một message/request/response bằng tiếng Anh, không dấu, sai chính tả, hoặc format legacy, thì vẫn phải giữ nguyên để đảm bảo `100% Laravel compatibility`, trừ khi người dùng yêu cầu rõ ràng thay đổi contract đó.
- **Đọc kỹ lệnh mới nhất trước khi làm**: Mỗi lần nhận yêu cầu từ người dùng, phải đọc kỹ yêu cầu mới nhất, file đang active, file được mention và migration guide liên quan trước khi sửa code/tài liệu. Nếu có xung đột, ưu tiên yêu cầu mới nhất nhưng không phá các quyết định migration đã khóa.
- **Không tự suy diễn ngoài phạm vi**: Chỉ sửa đúng endpoint/behavior/tài liệu người dùng yêu cầu; nếu cần mở rộng phạm vi để tránh sai behavior, phải ghi rõ trong migration guide và final response.

## 6. Documentation Update Rule
- **Bat buoc cap nhat tai lieu khi sua code**: Moi lan sua route, request/response, auth behavior, DB side effect, env/config, Swagger, guard, service logic, hoac trang thai blocker thi phai cap nhat file migration guide lien quan trong cung luot lam viec.
- **Khong chi sua source code**: Neu endpoint duoc code them/sua behavior nhung chua co Postman parity, cap nhat status thanh `CODED_PENDING_POSTMAN` va ghi note ro phan da doi.
- **Khi co blocker moi**: Cap nhat `8_AUTH_USER_CHECKLIST.md` neu thuoc Auth/User, va cap nhat `9_FULL_API_MIGRATION_PLAN.md` neu anh huong full API plan.
- **Khi them ha tang chung**: Cap nhat `2_RULES.md`, `3_AGENT_WORKFLOW.md`, hoac `9_FULL_API_MIGRATION_PLAN.md` tuy pham vi. Vi du: Swagger, JWT blacklist, guard behavior, env moi.

---

## 7. Câu hỏi Ôn tập & Tự đánh giá (Rules Review Questions)
1. **Database Safety**: Tại sao quy tắc `synchronize: false` trong cấu hình TypeORM là bắt buộc đối với một dự án migration? Điều gì sẽ xảy ra nếu vô tình kích hoạt `synchronize: true` trên cơ sở dữ liệu đã có sẵn dữ liệu của khách hàng?
2. **SQL Injection**: Hãy viết ví dụ một đoạn code thực hiện Raw SQL trong NestJS vi phạm quy tắc an toàn (bị SQL Injection) và sửa lại cho đúng quy tắc sử dụng Prepared Statement.
3. **API Compatibility**: Nếu Laravel trả về cấu trúc lỗi Validation với mã HTTP `406 Not Acceptable`, nhưng NestJS mặc định trả về `400 Bad Request`, chúng ta cần làm gì ở tầng ứng dụng NestJS để đồng bộ hành vi này mà không sửa đổi code client?
4. **Security**: Tại sao việc đồng bộ `JWT_SECRET` và thuật toán ký (`HS256`) giữa Laravel và NestJS lại là quy tắc bắt buộc khi chạy song song hai hệ thống?
