# users.service.ts Function Guide

File: `src/modules/users/users.service.ts`

## Vì Sao File Này Có Nhiều Hàm?

`UsersService` đang gom nhiều trách nhiệm từ Laravel `UsersController.php` vào một service NestJS:

- Xác thực: login, logout, check token, ký JWT.
- Query user: danh sách, chi tiết, filter, sort, pagination.
- Ghi user: update user, tạo user, upload avatar.
- Ghi phụ trợ: user log, data history, user config, access scopes, department extensions.
- Helper tương thích Laravel/PHP: `empty()`, format lỗi, format ngày, format paginator.

Vì vậy chỉ có một số hàm là API public. Phần còn lại là helper nhỏ để tách bớt logic, tránh nhồi mọi thứ vào một hàm lớn như Laravel.

## Nhóm API Public

Các hàm này được controller gọi trực tiếp.

| Hàm | API liên quan | Mục đích |
| --- | --- | --- |
| `login()` | `POST /api/v1/login` | Kiểm tra email/password, tạo JWT, ghi `users_log`, trả user/group/permission. |
| `logout()` | `POST /api/v1/logout` | Lấy token hiện tại, cập nhật log đăng xuất, xóa/invalidate token. |
| `checkToken()` | `POST /api/v1/checkToken` | Parse token từ Authorization/query/body và trả trạng thái token. |
| `me()` | `GET /api/v1/me` | Kiểm tra user hiện tại từ JWT payload có tồn tại hay không. |
| `getUsers()` | `POST /api/v1/users` | Lấy danh sách users, có phân quyền group, search, filter, sort, pagination. |
| `getUserByID()` | `GET /api/v1/user/:id` | Lấy chi tiết user theo id, bỏ password/remember_token. |
| `updateUser()` | `POST /api/v1/updateUser` | Validate và cập nhật user, avatar, scope, config, history, department. |
| `addUserAsMemberOfCompany()` | `POST /api/v1/addUserAsMemberOfCompany` | Validate và tạo user mới trong group/company. |

## Luồng Chính

### `login(body, request)`

Flow:

1. Lấy `email`, `password`, IP client.
2. Nếu thiếu email/password thì ghi log fail và ném lỗi.
3. Tìm user theo email bằng `findUserByEmail()`.
4. So mật khẩu bằng `bcrypt.compare()`, có xử lý hash Laravel `$2y$`.
5. Kiểm tra user `status === active`.
6. Ký JWT bằng `signUserToken()`.
7. Lấy lại user hiện tại từ token.
8. Kiểm tra group có bị `lock`.
9. Ghi log đăng nhập `insertUserLog()`.
10. Update `lastLogin`, `isOnline`.
11. Lấy privilege, queue, agents, group_hotline.
12. Trả response Laravel-like.

Hàm phụ gọi nhiều nhất: `getClientIp`, `insertUserLog`, `handleLoginFail`, `handleInvalidPassword`, `normalizeBcryptHash`, `signUserToken`, `processPrivileges`, `getQueueAndAgents`.

### `logout(body, request)`

Flow:

1. Lấy Bearer token bằng `extractBearerToken()`.
2. Verify token.
3. Nếu body có `id`, tìm `users_log` bằng `findUserLogById()`.
4. Tìm user hiện tại từ token.
5. Nếu user có `remember_token`, invalidate token đó.
6. Xóa `remember_token`.
7. Nếu log đang `sign-in`, đổi thành `sign-out`.
8. Blacklist token hiện tại bằng `invalidateToken()`.

### `checkToken(request)`

Flow:

1. Lấy token từ Authorization, query `token`, hoặc body `token` bằng `extractRequestToken()`.
2. Nếu không có token: trả `Token is missing`.
3. Nếu token đã blacklist: trả `Token is invalid`.
4. Verify JWT.
5. Kiểm tra các claim bắt buộc: `iss`, `iat`, `exp`, `nbf`, `sub`, `jti`.
6. Tìm user từ `sub`/`id`.
7. Trả `Success`, `User not found`, `Token has expired`, hoặc `Token is invalid`.

### `me(payload)`

Flow ngắn:

1. Lấy user hiện tại bằng `getCurrentUser()`.
2. Có user thì trả `{ message: "Success", code: 200 }`.
3. Không có thì trả `{ message: "User not found", code: 401 }`.

### `getUsers(body, payload, request)`

Flow:

1. Lấy current user từ JWT.
2. Tạo query builder từ bảng `users`.
3. Join `departments`, `user_types`, `groups`, `qr_code`, `user_config`.
4. Loại user `status = trash`.
5. Áp quyền theo role/group giống Laravel:
   - `superadmin`: xem tất cả hoặc filter theo `groupId`.
   - user thường: giới hạn theo `groupId` hiện tại hoặc chính user nếu groupId = 1.
6. Apply `departmentId`, `typeId`, `roleId`.
7. Apply search.
8. Apply filter động bằng `applyUserFilters()`.
9. Count total.
10. Chuẩn hóa phân trang.
11. Select các field mở rộng.
12. Apply sort bằng `applyUserOrder()`.
13. Lấy data, remove password/token.
14. Trả format paginator Laravel bằng `paginateLaravel()`.

### `getUserByID(id)`

Flow:

1. Parse id sang number.
2. Tìm user bằng `findUserById(id, true)`.
3. Nếu không có thì trả lỗi `user_id_not_exist`.
4. Trả user đã `sanitizeUser()`.

### `updateUser(body, payload, avatar)`

Flow:

1. Lấy `userId = body.id`.
2. Lọc params kiểu Laravel bằng `filteredUpdateUserParams()`.
3. Validate bằng `validateUpdateUserZod()`.
4. Tìm user cũ bằng `findRawUserById()`.
5. Lấy current user để set `updated_by`.
6. Build object update bằng `buildLaravelUpdateUserColumns()`.
7. Update bảng `users`.
8. Đồng bộ scope bằng `syncJntUserAccessScopes()`.
9. Upsert `user_config` bằng `upsertUserConfig()`.
10. Ghi history bằng `insertUpdateUserHistory()`.
11. Cập nhật department extension bằng `updateDepartmentExtension()`.
12. Trả user mới.

Ghi chú: hiện service đã sửa để chỉ update field được gửi trong body, tránh request chỉ gửi `phone` mà làm `firstName = null`.

### `addUserAsMemberOfCompany(body, payload, avatar)`

Flow:

1. Validate body bằng `validateAddMemberOfCompanyZod()`.
2. Lấy current user để set `created_by`.
3. Tính `userCode`.
4. Tạo entity `User`.
5. Hash password.
6. Save user.
7. Đồng bộ scope.
8. Insert QR nếu có `emailqr`.
9. Upload avatar nếu có.
10. Ghi `data_history`.
11. Cập nhật department extension.
12. Trả `{ success: { id } }`.

Ghi chú: nếu DB có trigger `BEFORE INSERT users`, trigger có thể ghi đè `userCode`.

## Nhóm Token Và Request Helper

| Hàm | Giải thích |
| --- | --- |
| `invalidateToken(token, exp)` | Đưa token vào blacklist nội bộ để logout xong không dùng lại được. |
| `invalidateStoredToken(token)` | Verify `remember_token` đang lưu rồi blacklist nó; lỗi thì bỏ qua giống Laravel. |
| `extractBearerToken(authorization)` | Tách token từ header `Authorization: Bearer ...`. |
| `extractRequestToken(request)` | Lấy token theo thứ tự: Authorization, query `token`, body `token`. |
| `headerToString(value)` | Chuẩn hóa header Express có thể là string hoặc array thành string. |
| `requestUrl(request)` | Dựng URL request để gắn vào claim `iss` khi ký JWT. |
| `randomJwtId()` | Sinh claim `jti` ngẫu nhiên cho JWT. |
| `signUserToken(user, remember, request)` | Ký JWT theo claim tương thích Laravel JWTAuth. |
| `jwtSecret()` | Lấy `JWT_SECRET`, thiếu thì ném lỗi 500. |

## Nhóm Query User/Group/Permission

| Hàm | Giải thích |
| --- | --- |
| `findUserByEmail(email)` | Tìm user theo email cho login. |
| `findUserById(id, includeRelations, includeTrashed)` | Tìm user theo id, bỏ password/token, có thể nạp userType/userGroup. |
| `findRawUserById(id, includeTrashed)` | Tìm user thô để update/history, không sanitize. |
| `getCurrentUser(payload)` | Lấy user hiện tại từ JWT payload `sub` hoặc `id`. |
| `getUserType(id)` | Query bảng `user_types`. |
| `getGroupById(id)` | Query group bằng TypeORM repository. |
| `getGroupForLogin(id)` | Lấy group để kiểm tra login có bị khóa không. |
| `getGroupHotline(groupId)` | Lấy hotline publish của group để build queue config. |
| `getUserPermissions(typeId)` | Lấy permissions theo `user_type_id`, tách `GROUP_CONCAT(action)` thành mảng. |
| `tableExists(table)` | Kiểm tra bảng optional có tồn tại trước khi query. |

## Nhóm Login/Permission/Queue

| Hàm | Giải thích |
| --- | --- |
| `processPrivileges(user)` | Từ permissions suy ra privilege list và cờ `isWebRTC`, `isReceiveChat`. |
| `getQueueAndAgents(curUser, user)` | Build `queue_name` và `agents_view`; superadmin xem tất cả, user thường xem theo group. |
| `insertUserLog(input)` | Ghi bảng `users_log` cho login fail/sign-in/sign-out. |
| `findUserLogById(id)` | Tìm log để logout cập nhật `sign_out_time`. |
| `handleLoginFail(email, ip)` | Đếm login fail trong ngày, quá ngưỡng thì khóa IP. |
| `handleInvalidPassword(email)` | Đếm sai mật khẩu từ lần login gần nhất, quá ngưỡng thì lock user. |
| `lockIp(ip)` | Insert/update bảng `ip_lock`. |

## Nhóm Update/Create User

| Hàm | Giải thích |
| --- | --- |
| `filteredUpdateUserParams(body)` | Lọc body update giống Laravel: bỏ null/rỗng trừ một số key được giữ. |
| `validateUpdateUserZod(body, userId)` | Validate update bằng Zod, check email trùng, group tồn tại, giới hạn user active. |
| `validateAddMemberOfCompanyZod(body)` | Validate tạo user mới, check email trùng, group tồn tại, giới hạn user active. |
| `buildLaravelUpdateUserColumns(params, body, userId, avatar, currentUserId)` | Chuyển body thành object update bảng `users`, hash password, xử lý avatar, set `updated_by`. |
| `storeUserAvatar(userId, avatar)` | Validate đuôi file, lưu avatar vào `img/user_avatar`. |
| `upsertUserConfig(userId, body, currentUserId)` | Update hoặc insert `user_config` nếu request có hotdesk/transports/port. |
| `insertUserConfigForCreatedUser(userId, body, currentUserId)` | Insert record `user_config` mới. |
| `syncJntUserAccessScopes(userId, body)` | Xóa/tạo lại scope region/branch/department nếu request gửi list tương ứng. |
| `normalizeScopeIds(value)` | Chuẩn hóa scope từ array hoặc chuỗi `1,2,3`. |
| `updateDepartmentExtension(body)` | Cập nhật mảng `departments.extensions` khi user có departmentId + extension. |
| `nextMideskUserCode()` | Sinh `userCode` cho `type_user = midesk`, dựa trên userCode 5 ký tự mới nhất. |

## Nhóm History/Audit

| Hàm | Giải thích |
| --- | --- |
| `insertUpdateUserHistory(params, oldUser, newUser, currentUser)` | Ghi `data_history` chi tiết old/new cho update user. |
| `insertUserHistory(action, oldUser, newUser, currentUser)` | Ghi `data_history` dạng chung cho insert/update. |
| `diffUsers(oldUser, newUser)` | So sánh các cột mutable để tạo payload `data_change`. |

## Nhóm Filter/Sort/Pagination

| Hàm | Giải thích |
| --- | --- |
| `applyUserFilters(filters, qb)` | Áp filter động vào query builder, chỉ cho cột/operator nằm trong whitelist. |
| `applyUserOrder(qb, sorts)` | Áp sort động, mặc định `users.id DESC`. |
| `paginateLaravel(data, total, perPage, currentPage, request)` | Đóng gói response giống Laravel paginator. |
| `paginationLinks(path, currentPage, lastPage)` | Tạo mảng `links` gồm Previous, từng page, Next. |
| `paginationUrl(path, page)` | Tạo URL page. |
| `requestPathWithoutQuery(request)` | Lấy URL hiện tại không kèm query string. |
| `normalizePage(value)` | Chuẩn hóa page thành số nguyên dương. |
| `normalizeLaravelRecordsOnPage(value)` | Chuẩn hóa page size, mặc định 10, tối đa 500. |

## Nhóm Utility Chung

| Hàm | Giải thích |
| --- | --- |
| `sanitizeUser(user)` | Xóa `password`, `remember_token` trước khi trả response. |
| `isJson(str)` | Kiểm tra string có parse được JSON object/array không. |
| `assignMissing(target, source)` | Merge object nhưng không ghi đè key đã có. |
| `isPhpEmpty(value)` | Mô phỏng `empty()` của PHP cho logic Laravel. |
| `hasOwn(source, key)` | Kiểm tra request body có thật sự gửi key đó không. |
| `isLaravelNullLoose(value)` | Kiểm tra null/rỗng kiểu Laravel khi lọc input update. |
| `normalizeBcryptHash(hash)` | Đổi hash `$2y$` của PHP sang `$2b$` để Node bcrypt compare được. |
| `getClientIp(request)` | Lấy IP từ `x-forwarded-for` hoặc `request.ip`. |
| `throwInvalidAccount()` | Ném lỗi sai tài khoản/mật khẩu theo format Laravel. |
| `throwLockedAccount()` | Ném lỗi tài khoản lock/pending theo format Laravel. |
| `throwError(errors, code, message)` | Helper ném `HttpException` thống nhất. |
| `keyBy(rows, key)` | Chuyển array rows thành object keyed theo field. |
| `unixNow()` | Trả Unix timestamp giây. |
| `nowSql(date)` | Format datetime hiện tại dạng SQL. |
| `startOfTodaySql()` | Format đầu ngày hiện tại. |
| `endOfTodaySql()` | Format cuối ngày hiện tại. |
| `toSqlDateTime(date)` | Format `Date` thành `YYYY-MM-DD HH:mm:ss`. |

## Các Constant/Type Đầu File

| Tên | Giải thích |
| --- | --- |
| `DbRow` | Type đơn giản cho một dòng query dạng object. |
| `AuthPayload` | Shape dữ liệu trong JWT payload. |
| `USER_MUTABLE_COLUMNS` | Các cột dùng khi diff old/new để ghi history. |
| `USER_TABLE_COLUMNS` | Whitelist cột `users` dùng cho filter/sort/update an toàn. |
| `USER_FILTER_TYPES` | Whitelist operator filter được phép dùng. |

## Có Nên Tách File Không?

Nên tách sau khi migrate ổn định. Gợi ý:

- `users-auth.service.ts`: `login`, `logout`, token helpers.
- `users-query.service.ts`: `getUsers`, `getUserByID`, pagination/filter/sort.
- `users-mutation.service.ts`: `updateUser`, `addUserAsMemberOfCompany`.
- `users-history.service.ts`: `insertUserHistory`, `insertUpdateUserHistory`, `diffUsers`.
- `users-support.service.ts`: scope, config, department, avatar.

Hiện tại để một file giúp so sánh Laravel dễ hơn, nhưng lâu dài nên tách để dễ bảo trì.
