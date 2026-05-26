# Kỹ năng cần thiết cho việc Migration (Skills)

Để di chuyển bộ API từ Laravel sang NestJS một cách thành công và hiệu quả, bạn cần nắm vững các nhóm kỹ năng sau:

## 1. NestJS Core Framework
- **Dependency Injection (DI) & DI Container**: Hiểu cách hoạt động của DI trong NestJS, cách đăng ký Providers ở Module và Inject vào các Service/Controller khác thông qua constructor.
- **NestJS Lifecycle Hooks**: Biết cách sử dụng `onModuleInit`, `onModuleDestroy` để khởi tạo hoặc giải phóng tài nguyên hệ thống (ví dụ: đóng các pool kết nối cơ sở dữ liệu khi tắt server).
- **Guards & Passport**: Hiểu cách bảo vệ route thông qua Guards, thiết lập Passport JWT Strategy để giải mã và xác thực token người dùng.

## 2. Quản lý Cơ sở dữ liệu đa kết nối (Multi-Database & TypeORM)
- **TypeORM Configuration**: Cách cấu hình nhiều kết nối (Multiple Connections/DataSources) song song (Main DB, Voice DB, PBX DB).
- **Repository Pattern vs Raw Queries**: Nắm vững cách sử dụng `Repository<Entity>` để thực hiện CRUD nhanh, và cách sử dụng raw queries thông qua `EntityManager` hoặc `Connection` để thực thi các câu lệnh SQL phức tạp có hiệu năng cao (đặc biệt đối với module báo cáo cuộc gọi CDR/QueueLog).
- **Dynamic Table Selection**: Kỹ năng viết truy vấn SQL động để tự động chọn bảng đích (`cdr` hoặc `cdr_monthly`) dựa trên tham số thời gian truyền lên.

## 3. TypeScript & REST API Standards
- **Data Transfer Object (DTO)**: Sử dụng các thư viện `class-validator` và `class-transformer` để kiểm tra và định dạng dữ liệu đầu vào (Request Validation).
- **TypeScript Type Safety**: Tránh lạm dụng kiểu `any`. Thiết lập các `interface` hoặc `type` rõ ràng cho kết quả trả về từ database.
- **RESTful API**: Khai báo Controller với các HttpMethod (`@Get`, `@Post`, `@Put`, `@Delete`), sử dụng `@Param`, `@Body`, `@Query`, `@Headers` để đón nhận dữ liệu.

## 4. Xử lý File và Báo cáo (Excel & Streams)
- **ExcelJS**: Sử dụng thư viện `exceljs` để sinh file Excel báo cáo thay thế cho `fast-excel` của Laravel.
- **Express Response Stream**: Cách truyền stream file trực tiếp về client để tối ưu RAM của server khi xuất dữ liệu lớn.

---

## 5. Câu hỏi Ôn tập & Tự đánh giá (Skills Review Questions)
1. **Dependency Injection**: Làm thế nào để tiêm (inject) một Repository thuộc kết nối database phụ (ví dụ: `'voice_server_1'`) vào một Service? Cú pháp decorator trong NestJS là gì?
2. **Lifecycle Hooks**: Tại sao lifecycle hook `onModuleDestroy` lại quan trọng trong việc đóng các kết nối database (Connection Pools) khi dừng ứng dụng? Điều gì xảy ra nếu bỏ qua bước này?
3. **Validation**: Làm thế nào để validate một trường dữ liệu dạng mảng các chuỗi (ví dụ: danh sách số điện thoại `phones: string[]`) sử dụng `class-validator`?
4. **Performance**: Việc trả về dữ liệu dưới dạng Stream (sử dụng `exceljs` write stream) mang lại lợi ích gì về mặt tài nguyên hệ thống (CPU/RAM) so với việc đọc hết dữ liệu vào mảng rồi ghi file trực tiếp?
