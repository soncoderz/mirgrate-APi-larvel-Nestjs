# 🧹 Báo Cáo Cleanup Code - Dự Án NestJS Migration

**Ngày tạo:** 2025-01-XX  
**Phiên bản:** 1.0  
**Trạng thái:** Đang migration (10% hoàn thành)

---

## 📊 Tổng Quan

| Loại | Số lượng | Trạng thái |
|------|----------|------------|
| **Services không dùng** | 3 | ⚠️ Cần xem xét |
| **Decorators không dùng** | 1 | ⚠️ Cần xem xét |
| **Guards không dùng** | 1 | ✅ Giữ lại (dùng sau) |
| **Duplicate constants** | 4 | ❌ Cần cleanup |
| **DatabaseService** | 1 | ⚠️ Đang chuyển sang TypeORM |
| **Entities mới tạo chưa dùng** | 9 | ✅ Sẽ dùng khi refactor |

---

## 🔴 CRITICAL - Cần Cleanup Ngay

### 1. **Duplicate Constants trong users.service.ts**

**Vấn đề:** Constants đã được tách ra file `users.constants.ts` nhưng vẫn còn duplicate trong `users.service.ts`

**File:** `src/modules/users/users.service.ts` (lines 41-159)

```typescript
// ❌ DUPLICATE - Đã có trong users.constants.ts
export type DbRow = Record<string, any>;
export type AuthPayload = { ... };
export const USER_SAFE_SELECT = `...`;
export const USER_MUTABLE_COLUMNS = new Set([...]);
export const USER_TABLE_COLUMNS = new Set([...]);
export const USER_FILTER_TYPES = new Set([...]);
```

**Giải pháp:**
```typescript
// ✅ Import từ constants file
import {
  DbRow,
  AuthPayload,
  USER_SAFE_SELECT,
  USER_MUTABLE_COLUMNS,
  USER_TABLE_COLUMNS,
  USER_FILTER_TYPES,
} from './users.constants';
```

**Tác động:** 
- Giảm ~120 dòng code
- Tránh inconsistency khi update constants
- Single source of truth

---

## ⚠️ MEDIUM - Services Chưa Được Sử Dụng

### 2. **QueryHelperService** - KHÔNG DÙNG

**File:** `src/common/services/query-helper.service.ts`

**Trạng thái:** 
- ✅ Đã export trong `CommonModule`
- ❌ KHÔNG có file nào import hoặc inject service này
- ❌ KHÔNG có method nào được gọi

**Nội dung:**
```typescript
@Injectable()
export class QueryHelperService {
  toPagination(body: any) { ... }
  escapeLike(value: string) { ... }
}
```

**Đề xuất:**
- [ ] **Option 1:** XÓA service này nếu không có kế hoạch dùng
- [ ] **Option 2:** Sử dụng trong `users.service.ts` để replace logic pagination thủ công
- [ ] **Option 3:** Giữ lại nếu các module khác sẽ dùng

**Lý do giữ lại:** Có thể hữu ích khi migrate các module khác (Groups, Customers, CDR)

---

### 3. **DateHelperService** - KHÔNG DÙNG

**File:** `src/common/services/date-helper.service.ts`

**Trạng thái:**
- ✅ Đã export trong `CommonModule`
- ❌ KHÔNG có file nào import hoặc inject service này
- ❌ KHÔNG có method nào được gọi

**Nội dung:**
```typescript
@Injectable()
export class DateHelperService {
  toDateRange(body: any) { ... }
  compareMonth(date1: string, date2: string) { ... }
  formatDate(date: Date) { ... }
}
```

**Đề xuất:**
- [ ] **Option 1:** XÓA service này
- [ ] **Option 2:** Sử dụng trong `users.service.ts` để replace các method date thủ công
- [ ] **Option 3:** Giữ lại cho CDR/QueueLog module (cần xử lý date range nhiều)

**Lý do giữ lại:** CDR và QueueLog module sẽ cần xử lý date range phức tạp

---

### 4. **MigrationStubService** - KHÔNG DÙNG (HIỆN TẠI)

**File:** `src/common/services/migration-stub.service.ts`

**Trạng thái:**
- ✅ Đã export trong `CommonModule`
- ❌ KHÔNG có file nào sử dụng
- ⚠️ Thiết kế cho các endpoint chưa migrate

**Mục đích:**
```typescript
// Trả về HTTP 501 cho endpoint chưa migrate
this.migrationStub.notMigrated({
  controller: 'UsersController',
  action: 'getHistory',
  method: 'POST',
  path: '/api/v1/getHistory',
});
```

**Đề xuất:**
- [x] **GIỮ LẠI** - Sẽ dùng khi scaffold các module còn lại
- [ ] Sử dụng trong các controller mới (Groups, Customers, CDR, ...)

**Lý do giữ lại:** Cần thiết cho migration plan, sẽ dùng khi tạo các module mới

---

### 5. **CurrentUser Decorator** - KHÔNG DÙNG

**File:** `src/common/decorators/current-user.decorator.ts`

**Trạng thái:**
- ✅ Đã tạo decorator
- ❌ KHÔNG có controller nào sử dụng `@CurrentUser()`
- ⚠️ Hiện tại dùng `@Req() request` và parse thủ công

**Cách dùng hiện tại (thủ công):**
```typescript
// ❌ Cách hiện tại - dài dòng
@Get('me')
@UseGuards(JwtAuthGuard)
me(@Req() request: RequestWithUser) {
  const user = this.parseRequestUser(request);
  return this.users.me(user);
}
```

**Cách dùng với decorator:**
```typescript
// ✅ Cách tốt hơn - ngắn gọn
@Get('me')
@UseGuards(JwtAuthGuard)
me(@CurrentUser() user: AuthPayload) {
  return this.users.me(user);
}
```

**Đề xuất:**
- [ ] **Option 1:** XÓA decorator nếu không dùng
- [x] **Option 2:** REFACTOR `users.controller.ts` để dùng decorator này
- [ ] **Option 3:** Giữ nguyên cách hiện tại

**Lý do nên dùng:** Code sạch hơn, ít boilerplate, type-safe

---

## ✅ KEEP - Services Đang Dùng Hoặc Sẽ Dùng

### 6. **DatabaseService** - ĐANG CHUYỂN SANG TYPEORM

**File:** `src/config/database.service.ts`

**Trạng thái:**
- ✅ Đã export trong `DatabaseModule`
- ⚠️ Hiện tại KHÔNG dùng trong `users.service.ts` (đã chuyển sang TypeORM)
- ✅ Sẽ cần cho các module khác chưa có Entity

**Đề xuất:**
- [x] **GIỮ LẠI** - Cần cho migration các module khác
- [ ] Dùng tạm cho CDR/QueueLog (chưa có Entity)
- [ ] Xóa sau khi tất cả module đã chuyển sang TypeORM

**Lý do giữ lại:** 
- CDR và QueueLog chưa có Entity (blocked - thiếu schema)
- Một số query phức tạp có thể cần raw SQL tạm thời

---

### 7. **ConnectorGuard** - CHƯA DÙNG NHƯNG CẦN THIẾT

**File:** `src/common/guards/connector.guard.ts`

**Trạng thái:**
- ✅ Đã export trong `CommonModule`
- ❌ Chưa có controller nào dùng
- ✅ Sẽ dùng cho `/api/connector/*` routes

**Mục đích:**
```typescript
// Cho phép xác thực linh hoạt:
// 1. JWT token (như bình thường)
// 2. X-Custom-Token header (cho external systems)
// 3. Bypass nếu JWT_ALLOW_UNAUTHENTICATED=true
```

**Đề xuất:**
- [x] **GIỮ LẠI** - Cần cho ConnectorModule (M9 trong migration plan)

---

## 🆕 NEW - Entities Mới Tạo Chưa Được Sử Dụng

### 8. **9 Entities Mới** - CHƯA REFACTOR VÀO SERVICE

**Files:**
- `src/modules/users/entities/group-hotline.entity.ts`
- `src/modules/users/entities/qrcode-mifone.entity.ts`
- `src/modules/users/entities/jnt-user-access-scope.entity.ts`
- `src/modules/users/entities/user-type.entity.ts`
- `src/modules/users/entities/ip-lock.entity.ts`
- `src/modules/users/entities/user-config.entity.ts`
- `src/modules/users/entities/user-privilege.entity.ts`
- `src/modules/users/entities/data-history.entity.ts`
- `src/modules/users/entities/department.entity.ts`

**Trạng thái:**
- ✅ Đã tạo entities với TypeORM decorators
- ✅ Đã import vào `users.module.ts`
- ❌ CHƯA được sử dụng trong `users.service.ts`
- ⚠️ Service vẫn dùng `entityManager.query()` (raw SQL)

**Đề xuất:**
- [ ] **REFACTOR users.service.ts** để dùng các entities này
- [ ] Thay thế ~20 raw SQL queries bằng TypeORM Repository
- [ ] Sử dụng các Repository Services đã tạo

**Tác động:**
- Loại bỏ hoàn toàn raw SQL
- Type-safe queries
- Dễ maintain và test

---

### 9. **9 Repository Services Mới** - CHƯA ĐƯỢC INJECT

**Files:**
- `src/modules/users/repositories/user-type.repository.ts`
- `src/modules/users/repositories/user-privilege.repository.ts`
- `src/modules/users/repositories/group-hotline.repository.ts`
- `src/modules/users/repositories/department.repository.ts`
- `src/modules/users/repositories/ip-lock.repository.ts`
- `src/modules/users/repositories/user-config.repository.ts`
- `src/modules/users/repositories/jnt-user-access-scope.repository.ts`
- `src/modules/users/repositories/qrcode-mifone.repository.ts`
- `src/modules/users/repositories/data-history.repository.ts`

**Trạng thái:**
- ✅ Đã tạo repository services
- ❌ CHƯA được inject vào `users.service.ts`
- ❌ CHƯA được sử dụng

**Đề xuất:**
- [ ] Inject các repositories vào `UsersService` constructor
- [ ] Refactor các method để dùng repositories
- [ ] Remove raw SQL queries

---

## 📋 Action Items - Ưu Tiên

### 🔴 HIGH PRIORITY (Làm ngay)

1. **[CRITICAL] Remove duplicate constants trong users.service.ts**
   - [ ] Import từ `users.constants.ts`
   - [ ] Xóa duplicate code (lines 41-159)
   - [ ] Test lại tất cả endpoints
   - **Estimate:** 15 phút

2. **[HIGH] Inject Repository Services vào UsersService**
   - [ ] Update constructor với 9 repositories
   - [ ] Refactor các method sử dụng raw SQL
   - [ ] Test từng method sau khi refactor
   - **Estimate:** 4-6 giờ

3. **[HIGH] Refactor để dùng @CurrentUser decorator**
   - [ ] Update `users.controller.ts`
   - [ ] Remove `parseRequestUser()` method
   - [ ] Simplify controller methods
   - **Estimate:** 1 giờ

### 🟡 MEDIUM PRIORITY (Làm sau)

4. **[MEDIUM] Quyết định về QueryHelperService**
   - [ ] Xem xét có dùng không
   - [ ] Nếu dùng: integrate vào UsersService
   - [ ] Nếu không: xóa khỏi CommonModule
   - **Estimate:** 30 phút

5. **[MEDIUM] Quyết định về DateHelperService**
   - [ ] Xem xét có dùng không
   - [ ] Nếu dùng: integrate vào UsersService
   - [ ] Nếu không: xóa khỏi CommonModule
   - **Estimate:** 30 phút

### 🟢 LOW PRIORITY (Làm khi rảnh)

6. **[LOW] Document các services đang giữ lại**
   - [ ] Add JSDoc cho MigrationStubService
   - [ ] Add usage examples
   - [ ] Update README
   - **Estimate:** 1 giờ

7. **[LOW] Cleanup unused imports**
   - [ ] Run ESLint với rule `no-unused-vars`
   - [ ] Remove unused imports
   - **Estimate:** 30 phút

---

## 📈 Metrics

### Before Cleanup
```
Total Lines: ~2,500
Duplicate Code: ~120 lines
Unused Services: 3
Raw SQL Queries: ~20
Type Safety: 80%
```

### After Cleanup (Expected)
```
Total Lines: ~2,200 (-12%)
Duplicate Code: 0 lines
Unused Services: 0
Raw SQL Queries: 0
Type Safety: 100%
```

---

## 🎯 Kết Luận

### ✅ Điểm Mạnh
1. Đã tạo đầy đủ entities và repositories
2. Đã có validation với Zod
3. Đã có guards và services cần thiết
4. Architecture tốt, chỉ cần refactor

### ⚠️ Điểm Cần Cải Thiện
1. **Duplicate constants** - Cần cleanup ngay
2. **Chưa dùng repositories** - Cần refactor
3. **Unused services** - Cần quyết định giữ/xóa
4. **Raw SQL còn lại** - Cần chuyển sang TypeORM

### 🚀 Next Steps
1. Cleanup duplicate constants (15 phút)
2. Refactor UsersService để dùng repositories (4-6 giờ)
3. Test toàn bộ endpoints (2 giờ)
4. Quyết định về unused services (1 giờ)
5. Document và update README (1 giờ)

**Total Estimate:** 8-10 giờ làm việc

---

## 📞 Contact

Nếu có câu hỏi về cleanup plan, liên hệ team lead hoặc tạo issue trên GitHub.

**Last Updated:** 2025-01-XX
