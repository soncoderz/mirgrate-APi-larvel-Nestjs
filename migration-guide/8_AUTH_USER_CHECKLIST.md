# Phase 1 Checklist - Auth/User Migration

Checklist nay dung khi bat dau migrate Auth/User tu Laravel sang NestJS.
Moi endpoint phai duoc lam chac va doi chieu voi Laravel truoc khi mark `DONE`.

## 0. Current implementation status

Snapshot ngay 2026-05-26:

- Scaffold NestJS da duoc tao trong target `D:\Thuc Tap\PHP\mirgrate-APi-larvel-Nestjs`.
- `npm install` da chay thanh cong, `npm run build` da pass.
- Code da co route/module cho full API set, endpoint chua migrate tra `501 NOT_MIGRATED`.
- Auth/User da code logic cho nhom endpoint core va them cac endpoint:
  `updateUserInfoByField`, `getUserNameByAgentsView`, `getUserTeam`,
  `deleteUser`, `deleteUsers`, `duplicateUser`, `logoutUserManual`.
- `POST /api/v1/logout` da cap nhat de invalidate JWT hien tai bang in-memory blacklist,
  clear `users.remember_token`, va update `users_log` theo Laravel behavior.
- `POST /api/v1/checkToken` da check JWT blacklist, token da logout se tra
  `{ message: "Token is invalid", code: 401 }`.
- `POST /api/v1/users` da cap nhat query theo Laravel `getUsers`: select `users.*`
  kem `departmentName`, `typeName`, `groupName`, `emailqr`, `created_name`,
  `updated_name`, `is_hotdesk`, `transports`, `port`, `is_google2fa`; ho tro
  filter/sort Laravel format, validate `recordsOnPage`, va paginator URL/links
  gom `links[].page`.
- MySQL pool da bat `dateStrings: true` de response datetime giong Laravel
  `YYYY-MM-DD HH:mm:ss`, khong tra ISO string.
- `POST /api/v1/updateUser` da cap nhat theo flow Laravel: filter params truoc validate,
  validate rule Laravel, update field explicit (`firstName`, `phone`, `mobile`, `address`,
  `note`, `otherId`, `otherEmail`, `is_google2fa`, `queues`, `extension`,
  `extensions_view`), upload `avatar`, upsert `user_config`, ghi `data_history`
  voi field list, va sync `departments.extensions`.
- `updateUser` co sync `jnt_user_access_scopes` neu table ton tai; SQL dump hien tai
  chua co DDL table nay nen service guard de tranh crash tren DB imported hien tai.
- Trang thai cua cac endpoint da code la `CODED_PENDING_POSTMAN`, chua mark `DONE`
  cho den khi co Postman parity voi Laravel.
- `getUserModuleShow`, `UpsertUserTeam`, `deleteTeam`, config trunk PDS va blacklist
  dang bi block vi source Laravel dang import model/table khong co trong source/schema hien tai.
- Bat buoc cap nhat checklist/plan moi khi sua code, behavior, env/config, guard, Swagger,
  DB side effect hoac blocker.

## 1. Setup truoc khi code

- [x] Scaffold NestJS app moi trong `D:\Thuc Tap\PHP\mirgrate-APi-larvel-Nestjs`.
- [x] Tao `.env.example` tu Laravel `.env`, chi de ten bien va placeholder, khong commit secret.
- [x] Cau hinh `main`, `voice`, `pbx` database connections.
- [x] Cau hinh `JWT_SECRET` va `JWT_ALGO` de dung chung token voi Laravel.
- [x] Cau hinh global prefix `/api`.
- [x] Cau hinh global exception filter de match Laravel error response.
- [ ] Dat Postman collection vao workspace va ghi path vao migration log.
- [x] Tao `AuthModule`, `UsersModule`, shared database service, JWT guard.

## 2. Endpoint order

Lam theo dung thu tu nay de giam dependency risk.

| Status | Endpoint | Laravel source | Notes |
| --- | --- | --- | --- |
| CODED_PENDING_POSTMAN | `POST /api/v1/login` | `UsersController@login` | Tao JWT, update login state, ghi `users_log` |
| CODED_PENDING_POSTMAN | `GET /api/v1/me` | `UsersController@me` | Protected route |
| CODED_PENDING_POSTMAN | `POST /api/v1/checkToken` | route maps to `UsersController@me` | Phai match route Laravel, reject token da bi logout/blacklist |
| CODED_PENDING_POSTMAN | `POST /api/v1/logout` | `UsersController@logout` | Invalidate Bearer token, clear `remember_token`, update `users_log` |
| CODED_PENDING_POSTMAN | `POST /api/v1/getUserToken` | `UsersController@getUserToken` | Token API integration |
| CODED_PENDING_POSTMAN | `POST /api/v1/resetPassword` | `UsersController@resetPassword` | Password verify + update |
| CODED_PENDING_POSTMAN | `POST /api/v1/forgotPassword` | `UsersController@forgotPassword` | Email/reset token behavior |
| CODED_PENDING_POSTMAN | `POST /api/v1/changePasswordForgot` | `UsersController@changePasswordForgot` | Reset password by token |
| CODED_PENDING_POSTMAN | `POST /api/v1/users` | `UsersController@getUsers` | Match Laravel select/join/filter/sort/paginator shape |
| CODED_PENDING_POSTMAN | `POST /api/v1/usersByRole` | `UsersController@getUsersByRole` | Role filter |
| CODED_PENDING_POSTMAN | `POST /api/v1/usersByExt` | `UsersController@getUserInfoByExtension` | Also used by connector |
| CODED_PENDING_POSTMAN | `GET /api/v1/user/:id` | `UsersController@getUserByID` | Hide password fields |
| CODED_PENDING_POSTMAN | `POST /api/v1/updateUser` | `UsersController@updateUser` | Laravel param filter/validate/update/user_config/history/department side effects |
| CODED_PENDING_POSTMAN | `POST /api/v1/updateUserInfoByField` | `UsersController@updateUserInfoByField` | `is_webRTC`/`is_receive_chat`; current SQL dump lacks these columns |
| CODED_PENDING_POSTMAN | `POST /api/v1/addUserAsMemberOfCompany` | `UsersController@addUserAsMemberOfCompany` | Create user in group |
| CODED_PENDING_POSTMAN | `POST /api/v1/getUserNameByAgentsView` | `UsersController@getUserNameByAgentsView` | Key by `agentId` |
| CODED_PENDING_POSTMAN | `POST /api/v1/getUsersByGroupId` | `UsersController@getUsersByGroupId` | Key by extension unless `all` is present |
| CODED_PENDING_POSTMAN | `POST /api/v1/getUserTeam` | `UsersController@getUserTeam` | Match current Laravel early return `data: []` |
| CODED_PENDING_POSTMAN | `POST /api/v1/deleteUser` | `UsersController@removeUser` | Match soft-delete behavior |
| CODED_PENDING_POSTMAN | `POST /api/v1/deleteUsers` | `UsersController@removeUsers` | Bulk delete |
| CODED_PENDING_POSTMAN | `GET /api/v1/duplicateUser/:id` | `UsersController@duplicateUser` | Duplicate user data/privilege behavior |
| CODED_PENDING_POSTMAN | `POST /api/v1/getUserLogs` | `UsersController@getUserLogs` | Pagination/filter |
| CODED_PENDING_POSTMAN | `POST /api/v1/deleteUserLog` | `UsersController@deleteUserLog` | Delete/log behavior |
| CODED_PENDING_POSTMAN | `POST /api/v1/logoutUserManual` | `UsersController@logoutUserManual` | Admin forced logout |

Hold until source/sample is clear:

| Status | Endpoint | Reason |
| --- | --- | --- |
| BLOCKED | `POST /api/v1/loginv2` | Route maps to `loginv3`, but source method not found |
| BLOCKED | `POST /api/v1/logoutv2` | Need exact Laravel behavior/sample |
| BLOCKED | `POST /api/v1/getUserModuleShow` | `UserModuleShow` model/table missing from source/schema |
| BLOCKED | `POST /api/v1/UpsertUserTeam` | Laravel uses missing `UserTeamStaff`, `TeleCampaign`, `TeleCampaignAssign` models/tables |
| BLOCKED | `POST /api/v1/deleteTeam` | Laravel `UserTeam` primary key/source behavior must be verified before porting |
| DEFERRED | `POST /api/v1/addUserByExcel` | Import/export work is out of Phase 1 |

## 3. Compatibility rules

- [ ] Preserve exact path and HTTP method.
- [ ] Preserve Laravel HTTP status, including `406` validation failures.
- [ ] Preserve response shape exactly, including raw arrays/objects if Laravel returns them.
- [ ] Use same JWT secret/algo as Laravel.
- [ ] Protected endpoints must reject invalid JWT like Laravel.
- [ ] Logout must invalidate the current JWT so protected routes reject it after logout.
- [ ] `checkToken` must reject tokens invalidated by logout.
- [ ] Do not return `password` or `remember_token`.
- [ ] Do not log or expose `.env` secret values.
- [ ] Use prepared statements for all raw SQL.
- [ ] Do not change database schema during migration.

## 4. Database side effects to verify

Check these after each relevant endpoint:

- [ ] `users.lastLogin`
- [ ] `users.isOnline`
- [ ] `users.status`
- [ ] `users.password`
- [ ] `users_log.status`
- [ ] `users_log.sign_in_time`
- [ ] `users_log.sign_out_time`
- [ ] `ip_lock.lock_time`
- [ ] `data_history.action`
- [ ] `data_history.data_change`

## 5. Per-endpoint acceptance checklist

For each endpoint, create a short migration log entry:

```text
ENDPOINT:
- METHOD /api/v1/path
- Laravel method:
- Tables read:
- Tables written:
- Side effects:
- Postman request:
- Laravel result:
- NestJS result:
- Status: TODO | IN_PROGRESS | DONE | BLOCKED
```

Endpoint can be marked `DONE` only when:

- [ ] Same Postman request works on Laravel.
- [ ] Same Postman request works on NestJS.
- [ ] HTTP status matches.
- [ ] JSON keys and data types match.
- [ ] Validation failure matches.
- [ ] Missing/invalid auth behavior matches.
- [ ] DB side effects match.
- [ ] `npm run build` passes.

## 6. Phase 1 final acceptance

Phase 1 Auth/User is complete only when:

- [ ] All non-blocked Auth/User endpoints are `DONE`.
- [ ] Postman Auth/User collection passes against NestJS.
- [ ] Postman Auth/User collection remains compatible with Laravel baseline.
- [ ] `npm run build` passes.
- [ ] No secrets are committed.
- [ ] No unrelated modules are migrated accidentally.
