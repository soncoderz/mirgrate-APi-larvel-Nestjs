# MASVN Contact Popup - NestJS Migration Guide

## 📋 Mô tả dự án

Dự án này là bản **migration từ Laravel sang NestJS** của hệ thống MASVN Contact Popup.

- **Source (Laravel)**: `d:\Thuc Tap\PHP\masvn-contactpopup-backend`
- **Target (NestJS)**: `d:\Thuc Tap\PHP\mirgrate-APi-larvel-Nestjs`
- **Base URL NestJS**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/api/docs`

---

## 🚀 Cài đặt & Chạy dự án

```bash
# 1. Cài đặt dependencies
npm install

# 2. Cấu hình môi trường
copy .env.example .env
# Mở .env và điền thông tin database

# 3. Chạy development mode (tương đương php artisan serve)
npm run start:dev

# 4. Build production
npm run build
npm run start:prod
```

---

## 🗄️ Cấu hình Database (.env)

```env
# Database chính
DB_CONNECTION=mysql       # hoặc pgsql cho PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=3306              # 5432 cho PostgreSQL
DB_DATABASE=midesk_contactpopup
DB_USERNAME=root
DB_PASSWORD=

# Database Voice/Call Log (voice_server_1)
DB_CONNECTION_VOICE=mysql
DB_HOST_VOICE=127.0.0.1
DB_PORT_VOICE=3306
DB_DATABASE_VOICE=midesk_contactpopup
DB_USERNAME_VOICE=root
DB_PASSWORD_VOICE=

# Database PBX (pbx01)
DB_CONNECTION_PBX=mysql
DB_HOST_PBX=127.0.0.1
DB_PORT_PBX=3306
DB_DATABASE_PBX=midesk_contactpopup
DB_USERNAME_PBX=root
DB_PASSWORD_PBX=

# JWT - PHẢI trùng với Laravel JWT_SECRET
JWT_SECRET=your_jwt_secret_here
JWT_ALGO=HS256
```

---

## 📁 Cấu trúc thư mục

```
src/
├── main.ts                   # Entry point
├── app.module.ts             # Root module
├── config/
│   ├── database.config.ts    # 3 DB connections
│   └── jwt.strategy.ts       # JWT passport strategy
├── common/
│   ├── guards/               # jwt-auth, jwt-or-header
│   ├── filters/              # Exception handling
│   ├── interceptors/         # Response formatting
│   └── decorators/           # @CurrentUser()
└── modules/
    ├── auth/                 # POST /login, /logout, /me
    ├── users/                # POST /users, GET /user/:id
    ├── customers/            # Quản lý khách hàng
    ├── groups/               # Quản lý nhóm/group
    ├── cdr/                  # Call Detail Records
    ├── queuelog/             # Queue Log
    ├── ivr-inbound/          # IVR Inbound
    ├── user-type/            # Loại user
    ├── export/               # File download
    └── connector/            # /connector/* routes
```

---

## 🔐 Authentication

### JWT Token

Token JWT tương thích 100% với Laravel. `JWT_SECRET` phải trùng với Laravel.

```javascript
// Request header
Authorization: Bearer <jwt_token>
```

### Lấy token (Login)

```bash
POST http://localhost:3000/api/v1/login
Content-Type: application/json

{
  "email": "superadmin@mipbx.vn",
  "password": "your_password"
}
```

### Response

```json
{
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "..." }
}
```

---

## 📡 API Routes

### Auth (Public)
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/v1/login | Đăng nhập |
| POST | /api/v1/loginv2 | Đăng nhập v2 |
| GET | /api/v1/me | Thông tin user hiện tại |
| POST | /api/v1/checkToken | Kiểm tra token |
| POST | /api/v1/logout | Đăng xuất |
| POST | /api/v1/forgotPassword | Quên mật khẩu |

### Users (JWT Required)
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/v1/users | Danh sách users |
| GET | /api/v1/user/:id | Chi tiết user |
| POST | /api/v1/updateUser | Cập nhật user |
| POST | /api/v1/deleteUser | Xóa user |
| POST | /api/v1/getUserLogs | Log đăng nhập |
| POST | /api/v1/getBlackList | Danh sách blacklist |

### Customers (JWT Required)
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/v1/customers | Danh sách khách hàng |
| GET | /api/v1/customer/:id | Chi tiết khách hàng |
| POST | /api/v1/addCustomer | Thêm khách hàng |
| POST | /api/v1/updateCustomer | Cập nhật |
| GET | /api/v1/removeCustomer/:id | Xóa |
| GET | /api/v1/getCustomerByPhone/:phone | Tìm theo số điện thoại |

### Groups (JWT Required)
| Method | URL | Mô tả |
|--------|-----|-------|
| GET | /api/v1/groups | Tất cả groups |
| GET | /api/v1/group/:id | Chi tiết group |
| POST | /api/v1/groupsWithPage | Phân trang |
| POST | /api/v1/addGroup | Thêm group |
| PUT | /api/v1/updateGroup/:id | Cập nhật |
| DELETE | /api/v1/deleteGroup/:id | Xóa |

### CDR - Call Detail Records
| Method | URL | Auth | Mô tả |
|--------|-----|------|-------|
| POST | /api/v1/cdr/getCalls | Public | Danh sách cuộc gọi |
| POST | /api/v1/cdr/getStaticCalls | Public | Thống kê |
| POST | /api/v1/cdr/getCallDetail | JWT | Chi tiết cuộc gọi |
| POST | /api/v1/cdr/reportBilling | JWT | Báo cáo billing |
| POST | /api/v1/cdr/reportAnsweredInbound | JWT | Inbound report |

### Queue Log
| Method | URL | Auth | Mô tả |
|--------|-----|------|-------|
| POST | /api/v1/queuelog/reportBySummary | Public | Tổng hợp |
| POST | /api/v1/queuelog/reportByQueues | Public | Theo queue |
| POST | /api/v1/queuelog/getQueueLogMissCall | JWT | Cuộc gọi nhỡ |

### Connector (jwt.or.header)
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/v1/connector/cdr/getCalls | CDR qua connector |
| POST | /api/v1/connector/usersByExt | User theo extension |
| POST | /api/v1/connector/queuelog/reportBySummary | Queue report |

---

## 🔄 So sánh Laravel vs NestJS

| Khái niệm | Laravel | NestJS |
|-----------|---------|--------|
| Entry point | `php artisan serve` | `npm run start:dev` |
| Controller | `app/Http/Controllers/` | `src/modules/*/controller.ts` |
| Model | `app/Models/*.php` | `src/modules/*/entities/*.entity.ts` |
| Middleware | `app/Http/Middleware/` | `src/common/guards/` |
| Auth | `jwt.auth` middleware | `@UseGuards(JwtAuthGuard)` |
| DB Query | Eloquent ORM | TypeORM |
| Response | `Helper::successResponse()` | `ResponseInterceptor` |
| Error | `Helper::errorResponse()` | `AllExceptionsFilter` |

---

## 📝 Lưu ý quan trọng khi migrate

1. **JWT Secret**: `JWT_SECRET` trong `.env` của NestJS PHẢI giống Laravel để token tương thích
2. **DB Connection**: TypeORM kết nối `voice_server_1` dùng annotation `@InjectRepository(Entity, 'voice_server_1')`
3. **Route prefix**: Laravel `/connector/` → NestJS `/api/v1/connector/` (do global prefix)
4. **Password hashing**: Dùng `bcrypt` giống Laravel
5. **Pagination**: Trả về cùng format `{ data, meta: { page, per_page, total, last_page } }`
