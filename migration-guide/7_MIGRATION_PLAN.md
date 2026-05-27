# Ke hoach migration MASVN Contact Popup Backend

File nay khoa cac quyet dinh truoc khi bat dau migrate code tu Laravel
`masvn-contactpopup-backend` sang NestJS.

Ke hoach tong the cho tat ca active routes nam o
`migration-guide/9_FULL_API_MIGRATION_PLAN.md`.

## 1. Quyet dinh da chot

| Hang muc | Quyet dinh |
| --- | --- |
| Target code chinh | `D:\Thuc Tap\PHP\mirgrate-APi-larvel-Nestjs` |
| Cach tao code | Scaffold NestJS app moi trong target project khi bat dau code |
| Repo reference | `mirgrate-APi-larvel-Nestjs-codex` chi dung de tham khao, khong phai source of truth |
| API compatibility | Tu 2026-05-27: giu route/request on dinh, nhung response/error theo chuan NestJS; Laravel chi lam baseline nghiep vu dung/sai |
| JWT compatibility | Bat buoc dung chung `JWT_SECRET` va `JWT_ALGO` voi Laravel |
| Migration style | Lam tung endpoint that chac, refactor sang TypeORM + Zod, khong scaffold hang loat roi bo logic |
| Database layer | TypeORM la chuan moi; `DatabaseService` chi la bridge tam cho endpoint legacy |
| Validation | Zod la chuan moi; khong dung them DTO `class-validator` |
| Phase dau tien | `Auth/User` |
| Export/import | De sau Phase 1 |
| Postman | Postman collection la acceptance source khi duoc dat vao workspace |
| DB local | `db_contactpopup_data.sql` da import, main DB da connect duoc |

## 2. Source Laravel da doc

Source Laravel: `D:\Thuc Tap\PHP\masvn-contactpopup-backend`

Route chinh: `routes/api.php`

Active API prefixes:

- `/api/v1`
- `/api/connector`

Active controller groups:

| Nhom | Laravel controller | NestJS module du kien |
| --- | --- | --- |
| Auth public | `UsersController` | `AuthModule`, `UsersModule` |
| Users protected | `UsersController` | `UsersModule` |
| User types | `UserTypeController` | `UserTypesModule` |
| Groups/departments | `GroupsController` | `GroupsModule` |
| Customers | `CustomersController` | `CustomersModule` |
| CDR | `CdrController` | `CdrModule` |
| Queue log | `QueueLogController` | `QueueLogsModule` |
| IVR inbound | `IvrInboundController` | `IvrInboundModule` |
| Export/download | `ExportController` | `ExportsModule` |
| Connector | mixed controllers | `ConnectorModule` |

Controllers co trong source nhung chua duoc active route dung:

- `AsteriskController.php`
- `JTController.php`

Khong migrate 2 controller nay cho den khi co Postman/frontend/cron caller chung minh can dung.

## 3. Blockers va constraints

### 3.1. Customer module dang blocked

`routes/api.php` co khai bao `CustomersController`, nhung file
`app\Http\Controllers\Managers\CustomersController.php` khong ton tai.

Ket qua:

- `php artisan route:list --path=api` fail vi class nay bi thieu.
- Khong migrate Customer theo cach doan logic.
- Customer chi duoc mo khoa khi co controller goc, Postman sample du, hoac frontend flow du de reconstruct.

### 3.2. CDR/Queue advanced dang blocked

Da kiem tra ca 2 file:

- `db_contactpopup_data.sql`
- `db_contactpopup_data 1.sql`

Hai file nay co `provider_prefix` va `provider_prefix_rate`, nhung khong co DDL cho:

- `cdr`
- `cdr_monthly`
- `cdr_yearly`
- `queue_log`
- `queue_log_monthly`
- `queue_log_yearly`
- `queue_agent_action`

Vi vay:

- Khong migrate CDR/Queue advanced cho den khi co schema voice DB that.
- Neu bat buoc lam sau nay, lay schema bang dump voice DB hoac `SHOW CREATE TABLE` tu live/dev DB.

### 3.3. Connector guard phai match Laravel

Laravel middleware `JwtOrHeader.php` dang permissive:

- Thu JWT truoc.
- Neu co `X-Custom-Token` thi cho qua.
- Sau do van cho qua request ngay ca khi khong co token hop le.

Quyet dinh: NestJS phai giu dung behavior Laravel hien tai de dam bao 100% compatibility. Neu muon fix security, tao change request rieng.

### 3.4. Route inconsistencies phai duoc ghi nhan

- `POST /api/v1/checkToken` trong route Laravel map toi `UsersController@me`; NestJS phai tra `{ message, code }` giong `me()`.
- `POST /api/v1/deleteUserTypes` bi khai bao 2 lan.
- `POST /api/v1/loginv2` map toi `UsersController@loginv3`, nhung source hien tai khong tim thay method `loginv3`.

Khi migrate cac route nay, uu tien Postman/frontend behavior va runtime Laravel thuc te.

## 4. Database contract

### Main DB

Laravel connection: `mysql`

NestJS connection name de dung trong code: `main`

Bang can cho Phase 1 Auth/User:

- `users`
- `users_log`
- `user_types`
- `user_privileges`
- `user_module`
- `user_module_sort`
- `user_config`
- `user_team`
- `ip_lock`
- `data_history`
- `groups`
- `group_hotline`
- `departments`

### Voice DB

Laravel connection: `voice_server_1`

NestJS connection name de dung trong code: `voice`

Trang thai: blocked cho CDR/Queue advanced do thieu schema.

### PBX DB

Laravel connection: `pbx01`

NestJS connection name de dung trong code: `pbx`

Dung sau Phase 1 cho SIP, queue config, extension secret, WebRTC va IVR sync.

## 5. Thu tu migration

### Phase 0 - Setup va acceptance source

1. Tao NestJS app moi trong `mirgrate-APi-larvel-Nestjs`.
2. Cau hinh `.env.example` theo Laravel `.env`, nhung khong commit secret that.
3. Cau hinh multi DB: `main`, `voice`, `pbx`.
4. Cau hinh JWT dung chung secret/algo voi Laravel.
5. Dat Postman collection vao workspace de lam acceptance source.
6. Tao migration log de danh dau endpoint `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

### Phase 1 - Auth/User

Lam theo checklist rieng: `migration-guide/8_AUTH_USER_CHECKLIST.md`.

Thu tu uu tien:

1. `POST /api/v1/login`
2. `GET /api/v1/me`
3. `POST /api/v1/checkToken`
4. `POST /api/v1/logout`
5. `POST /api/v1/getUserToken`
6. `POST /api/v1/resetPassword`
7. `POST /api/v1/forgotPassword`
8. `POST /api/v1/changePasswordForgot`
9. `POST /api/v1/users`
10. `POST /api/v1/usersByRole`
11. `POST /api/v1/usersByExt`
12. `GET /api/v1/user/:id`
13. `POST /api/v1/updateUser`
14. `POST /api/v1/addUserAsMemberOfCompany`
15. `POST /api/v1/deleteUser`
16. `POST /api/v1/deleteUsers`
17. `GET /api/v1/duplicateUser/:id`
18. `POST /api/v1/getUserLogs`
19. `POST /api/v1/deleteUserLog`
20. `POST /api/v1/logoutUserManual`

Endpoints Auth/User khong co method goc ro rang hoac can sample:

- `POST /api/v1/loginv2`
- `POST /api/v1/logoutv2`
- `POST /api/v1/addUserByExcel`

### Phase 2 - User type va permission

Sau Auth/User core:

- `GET /api/v1/userType/:id`
- `POST /api/v1/userTypesWithPage`
- `GET /api/v1/userTypes`
- `POST /api/v1/insertUserType`
- `PUT /api/v1/updateUserType/:id`
- `DELETE /api/v1/deleteUserType/:id`
- `POST /api/v1/deleteUserTypes`

### Phase 3 - Groups/departments

Lam read endpoints truoc, write endpoints sau:

- groups list/detail
- group by secret
- hotline/module reads
- department reads
- add/update/delete group
- add/update/delete department
- module duplication

### Phase 4 - Customer

Blocked den khi co `CustomersController.php` hoac acceptance sample du.

### Phase 5 - CDR/Queue

Blocked advanced reports den khi co voice schema.

Chi migrate CDR basic neu schema live DB duoc xac minh truoc khi code.

### Phase 6 - IVR

Lam CRUD/read truoc, PBX sync/cURL side effect sau.

### Phase 7 - Export/import/files

De sau cac API backing data da dung.

## 6. Definition of done cho moi endpoint

Mot endpoint chi duoc mark `DONE` khi dat tat ca dieu kien:

- Method/path giong Laravel 100%.
- Auth guard giong middleware Laravel.
- Request body/param/query duoc doc giong Laravel.
- Response JSON key, data type va HTTP status match Laravel.
- Validation fail match Laravel.
- DB reads/writes match bang va column that.
- Side effects match Laravel neu co: `users_log`, `isOnline`, `lastLogin`, `ip_lock`, `data_history`.
- Khong leak `password`, `remember_token`, JWT secret, DB secret.
- Postman request Laravel va NestJS cho ket qua compatible.
- `npm run build` pass.

## 7. Viec khong lam trong Phase 1

- Khong migrate Customer.
- Khong migrate CDR/Queue advanced.
- Khong migrate export/import Excel.
- Khong fix security behavior cua `/api/connector`.
- Khong copy nguyen code tu `-codex` neu chua review endpoint-by-endpoint.
