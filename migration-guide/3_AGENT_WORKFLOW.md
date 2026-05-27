# Luồng làm việc Migration từng Module (Agent Workflow)

Dưới đây là luồng làm việc chuẩn (Standard Workflow) khi tiến hành di chuyển một module bất kỳ từ Laravel sang NestJS:

```mermaid
graph TD
    A[Bắt đầu] --> B[Phân tích Laravel Routes & Controller]
    B --> C[Thiết lập TypeORM Entities tương ứng]
    C --> D[Viết DTOs và Validate dữ liệu đầu vào]
    D --> E[Xây dựng Service xử lý logic & Query DB]
    E --> F[Xây dựng Controller để expose API]
    F --> G[Bảo mật bằng JwtAuthGuard/JwtOrHeaderGuard]
    G --> H[Chạy thử dự án NestJS kiểm tra Swagger]
    H --> I[Chạy kiểm thử so khớp kết quả JSON]
    I --> K[Cap nhat migration guide/checklist]
    K --> J[Hoàn thành]
```

## Chi tiết các bước thực hiện:

### Bước 1: Phân tích mã nguồn Laravel gốc
- Mở file `routes/api.php` tìm các route thuộc module cần làm.
- Xác định Controller và phương thức xử lý (ví dụ: `UsersController@getUserLogs`).
- Đọc code controller đó để nắm được:
  - Tham số đầu vào nào là bắt buộc/tự chọn.
  - Các bảng dữ liệu nào tham gia truy vấn.
  - Logic nghiệp vụ (bắt lỗi, mã hoá, tính toán).

### Bước 2: Thiết lập Entities
- Khai báo Entity tương ứng với bảng đích trong thư mục `entities/` của module.
- Sử dụng đúng decorator của TypeORM (`@Entity`, `@PrimaryGeneratedColumn`, `@Column`).
- Sử dụng `@Exclude` của `class-transformer` đối với các trường nhạy cảm cần ẩn đi khi trả về client (như `password`, `remember_token`).

### Bước 3: Thiết lập DTOs
- Tạo DTO class để nhận request payload.
- Dùng decorator (`@IsString`, `@IsNotEmpty`, `@IsOptional`, `@IsArray`) để tự động kiểm soát lỗi validate ở gateway.

### Bước 4: Viết Service & Controller
- Tạo Service chứa logic nghiệp vụ và truy vấn DB. Inject đúng Repository hoặc Database Connection.
- Tạo Controller định nghĩa API route, chỉ định DTO đầu vào, gán Guard bảo mật (`@UseGuards(JwtAuthGuard)`).

### Bước 5: Chạy thử và Đối chiếu
- Khởi chạy NestJS bằng `npm run start:dev`.
- Truy cập Swagger API (`http://localhost:3000/api-docs`) để kiểm nghiệm cấu trúc API.
- Dùng Postman gọi thử cả 2 API Laravel và NestJS để so sánh kết quả trả về.

### Buoc 6: Cap nhat tai lieu bat buoc
- Sau moi lan sua code, config, guard, Swagger, auth behavior, DB side effect, hoac response shape, phai cap nhat file migration guide lien quan truoc khi ket thuc luot.
- Neu sua Auth/User, cap nhat `8_AUTH_USER_CHECKLIST.md`.
- Neu sua scope full API, blocker, module chung, env/config, guard, Swagger hoac milestone, cap nhat `9_FULL_API_MIGRATION_PLAN.md`.
- Neu them/sua quy tac lam viec, cap nhat `2_RULES.md` va file workflow nay.
- Khong mark `DONE` neu chua co Postman parity; dung `CODED_PENDING_POSTMAN` cho code da port nhung chua doi chieu Laravel.

---

## 6. Câu hỏi Ôn tập & Tự đánh giá (Workflow Review Questions)
1. **Phân tích code cũ**: Khi chuyển đổi một hàm Controller từ Laravel, những thành phần logic nào (Middleware, Custom Request, Eloquent Query, Response Formatting) bạn cần thu thập và chuyển dịch tương đương trong NestJS?
2. **DTO & Validation**: Hãy giải thích tại sao việc viết DTOs có định nghĩa kiểu dữ liệu và decorator validate lại tốt hơn việc dùng kiểu `filters: any` trong hàm nhận request của Controller?
3. **Data Serialization**: Làm thế nào để đảm bảo các trường nhạy cảm như `password` không bao giờ bị trả về client trong NestJS? Bạn cần khai báo decorator nào ở Entity và kích hoạt Interceptor nào ở file `main.ts`?
4. **Đối chiếu kết quả**: Khi kiểm thử đối chiếu API NestJS với API Laravel gốc bằng Postman, những tiêu chí nào (HTTP Status, Header, JSON Keys, Data Types) cần được so sánh chính xác để đánh giá API đạt chất lượng thay thế?
