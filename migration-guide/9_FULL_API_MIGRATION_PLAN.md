# Full API Migration Plan - Laravel to NestJS

Muc tieu cua file nay la lap ke hoach hoan thanh toan bo API dang active trong
`masvn-contactpopup-backend/routes/api.php`.

Quy tac goc:

- Chi migrate active routes, khong migrate routes dang comment tru khi co yeu cau rieng.
- Giu 100% Laravel compatibility ve method, path, request, response, HTTP status va side effects.
- Lam tung endpoint chac, co Postman parity, roi moi mark `DONE`.
- Target code chinh: `D:\Thuc Tap\PHP\mirgrate-APi-larvel-Nestjs`.
- Project `mirgrate-APi-larvel-Nestjs-codex` chi dung de tham khao implementation.

## 0. Current code status

Snapshot ngay 2026-05-26:

- M0 bootstrap da duoc implement trong target project va `npm run build` pass.
- Full active route set da co NestJS module/controller scaffold.
- Endpoint chua migrate duoc giu route va tra `501 NOT_MIGRATED` de tranh im lang sai behavior.
- M1 Auth/User dang `IN_PROGRESS`: core auth/user endpoints da co service logic, them cac endpoint
  `updateUserInfoByField`, `getUserNameByAgentsView`, `getUserTeam`, `deleteUser`,
  `deleteUsers`, `duplicateUser`, `logoutUserManual`.
- Swagger da duoc cau hinh tai `SWAGGER_PATH` mac dinh `api/docs` de test API.
- Logout da co JWT blacklist in-memory de reject token sau khi logout; neu can parity qua restart,
  can nang cap blacklist sang Redis/DB.
- `POST /api/v1/checkToken` cung check JWT blacklist de token da logout tra `code: 401`.
- `POST /api/v1/users` da cap nhat parity voi Laravel `getUsers`: full select/join fields,
  filter/sort Laravel format, `recordsOnPage` 406 validation, paginator URL/links
  gom `links[].page`, va datetime string format theo Laravel.
- Database pool dang dung `dateStrings: true` de tranh JSON ISO date khac Laravel.
- `POST /api/v1/updateUser` da cap nhat theo Laravel flow: param filter/validate,
  explicit field normalization, avatar upload, `user_config`, `data_history`,
  `departments.extensions`, va guarded `jnt_user_access_scopes` sync.
- `POST /api/v1/login` da duoc cap nhat dong bo logic gop `queue_config` tu hotlines, processPrivileges (`isWebRTC`, `isReceiveChat`), verify lai token sau khi sign, check group lock/existence, va getQueueAndAgents cho superadmin.
- `POST /api/v1/addUserAsMemberOfCompany` da dong bo hoan toan logic validate (address, note, status), default userCode unix timestamp (`unixNow()`), sync `JnTUserAccessScopes` cho scope types, insert `qrcode_mifone`, upload avatar va UPDATE user avatar field, sync `departments.extensions`, va giu `user_config` dang comment giong Laravel.
- Quy tac moi: moi lan sua code/behavior/config/guard/Swagger/side effect/blocker phai cap nhat
  migration guide lien quan trong cung luot.
- Chua endpoint nao duoc mark `DONE` vi chua co Postman collection de doi chieu Laravel vs NestJS.


## 1. Completion milestones

| Milestone | Ten | Dieu kien xong |
| --- | --- | --- |
| M0 | Bootstrap NestJS | DONE - app build pass, env/db/jwt/guard/error filter san sang |
| M1 | Auth/User | IN_PROGRESS - code ported for core endpoints, waiting Postman parity |
| M2 | UserType/Permission | User type CRUD va privilege behavior pass parity |
| M3 | Groups/Departments | Public group, protected group, department, module APIs pass parity |
| M4 | Customer | Customer APIs pass parity sau khi co controller/source sample |
| M5 | CDR v1 | CDR public/JWT reports pass parity sau khi co voice schema |
| M6 | QueueLog v1 | QueueLog v1 reports pass parity sau khi co voice schema |
| M7 | IVR inbound | IVR CRUD/read/write/PBX side effects pass parity |
| M8 | Export/import/files | Download, templates, Excel import/export pass parity |
| M9 | Connector | `/api/connector/*` pass parity voi Laravel permissive guard |
| M10 | Hardening | Full Postman collection pass, build pass, no secret leak |

## 2. Global implementation architecture

### 2.1. NestJS modules

Tao app NestJS moi voi cac modules:

- `AuthModule`: public auth routes from `UsersController`.
- `UsersModule`: protected user/admin routes.
- `UserTypesModule`: `UserTypeController`.
- `GroupsModule`: public/protected `GroupsController`.
- `CustomersModule`: `CustomersController` routes, initially `BLOCKED`.
- `CdrModule`: `/api/v1/cdr/*`.
- `QueueLogsModule`: `/api/v1/queuelog/*`.
- `IvrInboundModule`: `/api/v1/ivr_inbound/*`.
- `ExportsModule`: `/api/v1/export/*`, `/api/v1/exportExample/*`.
- `ConnectorModule`: `/api/connector/*`.
- `CommonModule`: guards, current-user decorator, exception filter, query helpers.
- `DatabaseModule`: `main`, `voice`, `pbx` connection pools.

### 2.2. Shared compatibility services

Can co cac service/helper chung:

- `DatabaseService`: prepared SQL query/transaction cho `main`, `voice`, `pbx`.
- `LaravelResponseService`: helper tao response/error format giong Laravel.
- `LaravelDateService`: format date/time, start/end day, unix conversions.
- `PaginationService`: tao pagination keys giong Laravel.
- `ExportStorageService`: file path, public URL, cleanup export files.
- `PostmanParityLog`: ghi endpoint status va request sample path.
- `JwtBlacklistService`: invalidate JWT sau logout; hien tai in-memory, co the doi sang Redis/DB neu can persist qua restart.

### 2.3. Guards

- `JwtAuthGuard`: match Laravel `jwt.auth`.
- `JwtOrHeaderGuard`: match Laravel `jwt.or.header`, bao gom behavior permissive hien tai.

Khong fix connector security trong migration. Neu muon tighten security, tao task rieng sau khi migration xong.

## 3. Blockers that must be resolved

### 3.1. Customer blocker

`CustomersController.php` khong ton tai trong source hien tai.

Customer routes phai de `BLOCKED` cho den khi co it nhat mot trong cac nguon:

- Controller goc tu repo/branch/backup.
- Postman collection co request/response du cho customer flows.
- Frontend code goi customer APIs du de reconstruct behavior.

### 3.2. Voice DB schema blocker

Hai file SQL hien co khong co DDL cho:

- `cdr`
- `cdr_monthly`
- `cdr_yearly`
- `queue_log`
- `queue_log_monthly`
- `queue_log_yearly`
- `queue_agent_action`

CDR/Queue advanced phai de `BLOCKED` den khi co voice DB schema that.

### 3.3. Route anomalies

Phai ghi status rieng:

- `POST /api/v1/checkToken` maps to `UsersController@me`.
- `POST /api/v1/loginv2` maps to `UsersController@loginv3`, but `loginv3` is not found in source.
- `POST /api/v1/deleteUserTypes` is declared twice.
- `POST /api/v1/getUserModuleShow` imports `UserModuleShow`, but model/table is missing.
- `POST /api/v1/UpsertUserTeam` imports `UserTeamStaff`, `TeleCampaign`, `TeleCampaignAssign`,
  but source/schema for those models/tables is missing.
- `POST /api/v1/getUserTeam` currently returns early with `{ code: 200, message: "Action success", data: [] }`;
  unreachable code below it must not be treated as active behavior until Laravel source changes.

Khong tu y "sua cho dep"; phai match runtime/Postman behavior.

## 4. Route inventory and phase assignment

Status values:

- `TODO`: can migrate when phase starts.
- `BLOCKED`: missing source/schema/sample.
- `DEFERRED`: intentionally later phase.
- `DUPLICATE_CHECK`: duplicate/anomaly must be verified.

### 4.1. Root/test

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| CODED_PENDING_POSTMAN | M0 | GET | `/api/v1/hello2` | closure |

### 4.2. Auth public routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/forgotPassword` | `UsersController@forgotPassword` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/checkToken` | `UsersController@me`; checks JWT blacklist |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/checkRecaptcha` | `UsersController@checkRecaptcha` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/changePasswordForgot` | `UsersController@changePasswordForgot` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/getUserToken` | `UsersController@getUserToken` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/login` | `UsersController@login` |
| BLOCKED | M1 | POST | `/api/v1/loginv2` | `UsersController@loginv3` missing in source |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/loginExternal` | `UsersController@loginExternal` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/logout` | `UsersController@logout`; invalidates Bearer token |
| BLOCKED | M1 | POST | `/api/v1/logoutv2` | `UsersController@logoutv2`; verify source/sample |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/addUserAsCompany` | `UsersController@addUserAsCompany` |
| DEFERRED | M8 | POST | `/api/v1/addUserByExcel` | `UsersController@addUserByExcel` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/resetPassword` | `UsersController@resetPassword` |

### 4.3. Users protected routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| CODED_PENDING_POSTMAN | M1 | GET | `/api/v1/me` | `UsersController@me` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/users` | `UsersController@getUsers`; full select/join/filter/sort/paginator parity |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/usersByRole` | `UsersController@getUsersByRole` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/usersByExt` | `UsersController@getUserInfoByExtension` |
| CODED_PENDING_POSTMAN | M1 | GET | `/api/v1/user/{id}` | `UsersController@getUserByID` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/updateUser` | `UsersController@updateUser`; Laravel flow/side effects ported |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/updateUserInfoByField` | `UsersController@updateUserInfoByField` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/addUserAsMemberOfCompany` | `UsersController@addUserAsMemberOfCompany` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/getUserNameByAgentsView` | `UsersController@getUserNameByAgentsView` |
| BLOCKED | M1 | POST | `/api/v1/getUserModuleShow` | `UsersController@getUserModuleShow`; missing model/table |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/getUsersByGroupId` | `UsersController@getUsersByGroupId` |
| BLOCKED | M1 | POST | `/api/v1/getHistory` | `UsersController@getHistory`; method not found in current source |
| TODO | M2 | POST | `/api/v1/duplicatePrivilege` | `UsersController@duplicatePrivilege` |
| DEFERRED | M8 | POST | `/api/v1/exportPrivilege` | `UsersController@exportPrivilege` |
| BLOCKED | M1 | POST | `/api/v1/unsetUserAvatar` | `UsersController@unsetUserAvatar`; method not found in current source |
| BLOCKED | M3 | POST | `/api/v1/getConfigTrunkPDS` | `UsersController@getConfigTrunkPDS`; `ConfigTrunkPDS` model/table missing |
| BLOCKED | M3 | POST | `/api/v1/insertConfigTrunkPDS` | `UsersController@insertConfigTrunkPDS`; `ConfigTrunkPDS` model/table missing |
| BLOCKED | M3 | POST | `/api/v1/updateConfigTrunkPDS` | `UsersController@updateConfigTrunkPDS`; `ConfigTrunkPDS` model/table missing |
| BLOCKED | M3 | POST | `/api/v1/deleteConfigTrunkPDS` | `UsersController@deleteConfigTrunkPDS`; `ConfigTrunkPDS` model/table missing |
| BLOCKED | M4 | POST | `/api/v1/getBlackList` | `UsersController@getBlackList`; `Blacklist` model/table missing |
| BLOCKED | M4 | POST | `/api/v1/insertBlackList` | `UsersController@insertBlackList`; `Blacklist` model/table missing |
| BLOCKED | M4 | POST | `/api/v1/updateBlackList` | `UsersController@updateBlackList`; `Blacklist` model/table missing |
| BLOCKED | M4 | POST | `/api/v1/deleteBlackList` | `UsersController@deleteBlackList`; `Blacklist` model/table missing |
| DEFERRED | M8 | POST | `/api/v1/importBlackList` | `UsersController@importBlackList` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/getUserTeam` | `UsersController@getUserTeam` |
| BLOCKED | M1 | POST | `/api/v1/UpsertUserTeam` | `UsersController@UpsertUserTeam`; missing dependent models/tables |
| BLOCKED | M1 | POST | `/api/v1/deleteTeam` | `UsersController@deleteTeam`; source/schema behavior must be verified |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/deleteUser` | `UsersController@removeUser` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/deleteUsers` | `UsersController@removeUsers` |
| CODED_PENDING_POSTMAN | M1 | GET | `/api/v1/duplicateUser/{id}` | `UsersController@duplicateUser` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/getUserLogs` | `UsersController@getUserLogs` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/deleteUserLog` | `UsersController@deleteUserLog` |
| CODED_PENDING_POSTMAN | M1 | POST | `/api/v1/logoutUserManual` | `UsersController@logoutUserManual` |
| CODED_PENDING_POSTMAN | M1 | GET | `/api/v1/getuserLogsByGroupId/{groupId}` | `UsersController@getuserLogsByGroupId` |
| DEFERRED | M8 | POST | `/api/v1/exportUsers` | `UsersController@exportUsers` |

### 4.4. UserType protected routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| TODO | M2 | GET | `/api/v1/userType/{id}` | `UserTypeController@getUserType` |
| TODO | M2 | POST | `/api/v1/userTypesWithPage` | `UserTypeController@getUserTypesWithPage` |
| TODO | M2 | GET | `/api/v1/userTypes` | `UserTypeController@getUserTypes` |
| TODO | M2 | POST | `/api/v1/insertUserType` | `UserTypeController@insertUserType` |
| TODO | M2 | PUT | `/api/v1/updateUserType/{id}` | `UserTypeController@updateUserType` |
| TODO | M2 | DELETE | `/api/v1/deleteUserType/{id}` | `UserTypeController@deleteUserType` |
| DUPLICATE_CHECK | M2 | POST | `/api/v1/deleteUserTypes` | `UserTypeController@deleteUserTypes` |
| DUPLICATE_CHECK | M2 | POST | `/api/v1/deleteUserTypes` | `UserTypeController@getUserTypesWithPage` |

### 4.5. Groups public routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| TODO | M3 | GET | `/api/v1/groupBySecret/{secret?}` | `GroupsController@getGroupBySecret` |
| TODO | M3 | GET | `/api/v1/getExtensionQueueBySecret/{secret?}` | `GroupsController@getExtensionQueueBySecret` |
| TODO | M3 | GET | `/api/v1/getQueueBySecret/{secret?}` | `GroupsController@getQueueBySecret` |
| TODO | M3 | POST | `/api/v1/addExtensionByGroup` | `GroupsController@addExtensionByGroup` |
| TODO | M3 | GET | `/api/v1/getExtensionNameBySecret/{secret?}` | `GroupsController@getExtensionNameBySecret` |
| DEFERRED | M8 | GET | `/api/v1/files/cronjobScanFileDownload` | `GroupsController@cronjobScanFileDownload` |
| DEFERRED | M8 | GET | `/api/v1/cronjobDailyLogoutQueuePDS` | `GroupsController@cronjobDailyLogoutQueuePDS` |
| DEFERRED | M8 | GET | `/api/v1/cronjobReportSummaryHalfDay` | `GroupsController@cronjobReportSummaryHalfDay` |
| DEFERRED | M8 | GET | `/api/v1/scanUpdateCauseCode` | `GroupsController@scanUpdateCauseCode` |

### 4.6. Groups protected routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| TODO | M3 | GET | `/api/v1/readConfigModules` | `GroupsController@readConfigModules` |
| TODO | M3 | POST | `/api/v1/writeConfigModules` | `GroupsController@writeConfigModules` |
| TODO | M3 | POST | `/api/v1/groupsWithPage` | `GroupsController@getGroupsWithPage` |
| TODO | M3 | POST | `/api/v1/groupsWithPagev2` | `GroupsController@getGroupsWithPagev2` |
| TODO | M3 | POST | `/api/v1/groupsWithPagev3` | `GroupsController@getGroupsWithPagev3` |
| TODO | M3 | POST | `/api/v1/getGroupInfov2` | `GroupsController@getGroupInfov2` |
| TODO | M3 | GET | `/api/v1/groups` | `GroupsController@getGroups` |
| TODO | M3 | GET | `/api/v1/group/{groupId}` | `GroupsController@getGroup` |
| TODO | M3 | POST | `/api/v1/addGrouphotline` | `GroupsController@addGrouphotline` |
| TODO | M3 | GET | `/api/v1/getHotline/{groupId?}` | `GroupsController@getHotline` |
| TODO | M3 | POST | `/api/v1/addGroup` | `GroupsController@addGroup` |
| TODO | M3 | PUT | `/api/v1/updateGroup/{groupId}` | `GroupsController@updateGroup` |
| TODO | M3 | GET | `/api/v1/getExtensionByGroup/{groupId}` | `GroupsController@getExtensionByGroup` |
| TODO | M3 | POST | `/api/v1/updatewebhook` | `GroupsController@updateWebhook` |
| TODO | M3 | POST | `/api/v1/updateConfigSMS` | `GroupsController@updateConfigSMS` |
| TODO | M3 | POST | `/api/v1/updateConfigDashboard` | `GroupsController@updateConfigDashboard` |
| TODO | M3 | POST | `/api/v1/duplicateGroup` | `GroupsController@duplicateGroup` |
| TODO | M3 | DELETE | `/api/v1/deleteGroup/{id}` | `GroupsController@deleteGroup` |
| TODO | M3 | POST | `/api/v1/deleteGroups` | `GroupsController@deleteGroups` |
| TODO | M3 | POST | `/api/v1/deleteGroupHotline` | `GroupsController@deleteGroupHotline` |
| TODO | M3 | GET | `/api/v1/getUserModules/{groupId?}` | `GroupsController@getUserModules` |
| TODO | M3 | GET | `/api/v1/duplicateModule/{groupId}/{groupIdTo}` | `GroupsController@duplicateModule` |
| TODO | M3 | POST | `/api/v1/addUserModules` | `GroupsController@addUserModules` |
| TODO | M3 | POST | `/api/v1/updateCampaignProcess` | `GroupsController@updateCampaignProcess` |
| TODO | M3 | POST | `/api/v1/getDepartments` | `GroupsController@getDepartmentsWithPage` |
| TODO | M3 | POST | `/api/v1/deleteDepartment` | `GroupsController@deleteDepartment` |
| TODO | M3 | POST | `/api/v1/getExtensionsDepartment` | `GroupsController@getExtensionsDepartment` |
| TODO | M3 | POST | `/api/v1/addDepartment` | `GroupsController@addDepartment` |
| TODO | M3 | POST | `/api/v1/updateDepartment` | `GroupsController@updateDepartment` |
| TODO | M3 | POST | `/api/v1/updateExtDepartment` | `GroupsController@updateExtDepartment` |
| TODO | M3 | POST | `/api/v1/updateDepartmentUser` | `GroupsController@updateDepartmentUser` |
| TODO | M3 | GET | `/api/v1/reason/getList/{groupId}` | `GroupsController@getListReason` |
| DEFERRED | M8 | POST | `/api/v1/getListDownload` | `GroupsController@getListDownload` |
| TODO | M3 | GET | `/api/v1/getUserModulesSort` | `GroupsController@getUserModulesSort` |

### 4.7. Customers protected routes

All Customer routes are `BLOCKED` until `CustomersController.php` or equivalent acceptance samples are available.

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| BLOCKED | M4 | GET | `/api/v1/customer/{userId}` | `CustomersController@getCustomerByID` |
| BLOCKED | M4 | GET | `/api/v1/customers/latest` | `CustomersController@getLatestCustomer` |
| BLOCKED | M4 | POST | `/api/v1/customers` | `CustomersController@getCustomers` |
| BLOCKED | M4 | POST | `/api/v1/addCustomerAndNote` | `CustomersController@addCustomerAndNote` |
| BLOCKED | M8 | POST | `/api/v1/addCustomerByExcel` | `CustomersController@addCustomerByExcel` |
| BLOCKED | M4 | POST | `/api/v1/addCustomer` | `CustomersController@addCustomer` |
| BLOCKED | M4 | GET | `/api/v1/duplicateCustomer/{id}` | `CustomersController@duplicateCustomer` |
| BLOCKED | M8 | POST | `/api/v1/importFile` | `CustomersController@downloadFile` |
| BLOCKED | M8 | POST | `/api/v1/exportCustomer` | `CustomersController@exportCustomer` |
| BLOCKED | M4 | POST | `/api/v1/addCustomerAcbs` | `CustomersController@addCustomerAcbs` |
| BLOCKED | M4 | POST | `/api/v1/addCustomerNew` | `CustomersController@addCustomerNew` |
| BLOCKED | M4 | POST | `/api/v1/addCusByZalo` | `CustomersController@addCusByZalo` |
| BLOCKED | M4 | POST | `/api/v1/customersField` | `CustomersController@getCustomerField` |
| BLOCKED | M4 | POST | `/api/v1/addCustomerField` | `CustomersController@addCustomerField` |
| BLOCKED | M4 | PUT | `/api/v1/updateCustomerField` | `CustomersController@updateCustomerField` |
| BLOCKED | M4 | PUT | `/api/v1/deleteCustomerField` | `CustomersController@deleteCustomerField` |
| BLOCKED | M4 | PUT | `/api/v1/updateDefaultView` | `CustomersController@updateDefaultView` |
| BLOCKED | M4 | POST | `/api/v1/updateCustomerFieldData` | `CustomersController@updateCustomerFieldData` |
| BLOCKED | M4 | POST | `/api/v1/updateCustomerV2` | `CustomersController@updateCustomerV2` |
| BLOCKED | M4 | POST | `/api/v1/updateCustomer` | `CustomersController@updateCustomer` |
| BLOCKED | M4 | GET | `/api/v1/removeCustomer/{id}` | `CustomersController@removeCustomer` |
| BLOCKED | M4 | PUT | `/api/v1/removeCustomers` | `CustomersController@removeCustomers` |
| BLOCKED | M4 | PUT | `/api/v1/updateCustomerTags/{id}` | `CustomersController@updateCustomerTags` |
| BLOCKED | M4 | GET | `/api/v1/getCustomerByPhone/{phone}` | `CustomersController@getCustomerByPhone` |
| BLOCKED | M4 | GET | `/api/v1/getInfoCustomerAcbs/{phone}` | `CustomersController@getInfoCustomerAcbs` |

### 4.8. CDR routes

CDR public/basic can only be migrated after confirming live voice schema or a source-compatible SQL contract.

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCalls` | `CdrController@getCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getStaticCalls` | `CdrController@getStaticCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getStaticCallsv2` | `CdrController@getStaticCallsv2` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelv2` | `CdrController@exportExcelv2` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCallsLog` | `CdrController@getCallsLog` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getStaticCallsLog` | `CdrController@getStaticCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportByYear` | `CdrController@reportByYear` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCallDetail` | `CdrController@getCallDetail` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getStaticCallDetail` | `CdrController@getStaticCallDetail` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getVoiceBoxCalls` | `CdrController@getVoiceBoxCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getPostmanCalls` | `CdrController@getPostmanCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getStaticPostmanCalls` | `CdrController@getStaticPostmanCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportAnsweredOutbound` | `CdrController@reportAnsweredOutbound` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportAnsweredInbound` | `CdrController@reportAnsweredInbound` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportAnsweredInboundDetail` | `CdrController@reportAnsweredInboundDetail` |
| BLOCKED | M5 | POST | `/api/v1/cdr/searchExtensions` | `CdrController@searchExtensions` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportSummaryCalls` | `CdrController@reportSummaryCalls` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCSATSummary` | `CdrController@getCSATSummary` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCSATDetail` | `CdrController@getCSATDetail` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportOutboundByAgents` | `CdrController@reportOutboundByAgents` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportOutboundByDates` | `CdrController@reportOutboundByDates` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportBilling` | `CdrController@reportBilling` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportSummaryAgentCallInOut` | `CdrController@reportSummaryAgentCallInOut` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getFavouriteCalls` | `CdrController@getFavouriteCallsv2` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportInOut` | `CdrController@reportInOut` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCSATSummaryv2` | `CdrController@getCSATSummaryv2` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCSATDetailv2` | `CdrController@getCSATDetailv2` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelv3` | `CdrController@exportExcelv3` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelByFastExcel` | `CdrController@exportExcelByFastExcel` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getCallsOvertime` | `CdrController@getCallsOvertime` |
| TODO | M5 | POST | `/api/v1/cdr/getProviderPrefix` | `CdrController@getProviderPrefix` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportDepartment` | `CdrController@reportDepartment` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getQueuePerformance` | `CdrController@getQueuePerformance` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getIntervalTrend` | `CdrController@getIntervalTrend` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getAgentPerformance` | `CdrController@getAgentPerformance` |
| BLOCKED | M5 | POST | `/api/v1/cdr/getAgentStatus` | `CdrController@getAgentStatus` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportBillingRate` | `CdrController@reportBillingRate` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportCallZCC` | `CdrController@reportCallZCC` |
| BLOCKED | M5 | POST | `/api/v1/cdr/transferDataToHistory` | `CdrController@transferDataToHistory` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportBilling` | `CdrController@exportBilling` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelData` | `CdrController@exportExcelData` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelFile` | `CdrController@exportExcelFile` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportDidSummary` | `CdrController@reportDidSummary` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportDidByCallLength` | `CdrController@reportDidByCallLength` |
| BLOCKED | M5 | POST | `/api/v1/cdr/reportAgentSummary` | `CdrController@reportAgentSummary` |
| DEFERRED | M8 | POST | `/api/v1/cdr/exportExcelReportKPI` | `CdrController@exportExcelReportKPI` |

### 4.9. QueueLog v1 routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| BLOCKED | M6 | POST | `/api/v1/queuelog/reportUnAnsweredByQueues` | `QueueLogController@reportUnAnsweredByQueues` |
| DEFERRED | M8 | POST | `/api/v1/queuelog/exportExcelv2` | `QueueLogController@exportExcelv2` |
| BLOCKED | M6 | POST | `/api/v1/queuelog/getQueueLogMissCall` | `QueueLogController@reportQueueLogMissCallDetail` |
| BLOCKED | M6 | POST | `/api/v1/queuelog/getInboundCalls` | `QueueLogController@getInboundCalls` |
| BLOCKED | M6 | GET | `/api/v1/queuelog/updateNoAnswerQueueLog` | `QueueLogController@updateNoAnswerQueueLog` |

### 4.10. IVR inbound routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundDID` | `IvrInboundController@getIVRInboundDID` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundDIDWithPage` | `IvrInboundController@getIVRInboundDIDWithPage` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditDIDForIVRInbound` | `IvrInboundController@addEditDIDForIVRInbound` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundRecord` | `IvrInboundController@getIVRInboundRecord` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundRecordWithPage` | `IvrInboundController@getIVRInboundRecordWithPage` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditRecordForIVRInbound` | `IvrInboundController@addEditRecordForIVRInbound` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getAndPlayRecord` | `IvrInboundController@getAndPlayRecord` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundInboundRoute` | `IvrInboundController@getIVRInboundInboundRoute` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditRouteForIVRInbound` | `IvrInboundController@addEditRouteForIVRInbound` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundTimeCondition` | `IvrInboundController@getIVRInboundTimeCondition` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getTimeCondition` | `IvrInboundController@getTimeCondition` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditTimeConditionForIVRInbound` | `IvrInboundController@addEditTimeConditionForIVRInbound` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getTimeConditionByDID` | `IvrInboundController@getTimeConditionByDID` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundTimeGroup` | `IvrInboundController@getIVRInboundTimeGroup` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getTimeGroup` | `IvrInboundController@getTimeGroup` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditTimeGroupForIVRInbound` | `IvrInboundController@addEditTimeGroupForIVRInbound` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVRInboundIVR` | `IvrInboundController@getIVRInboundIVR` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/getIVR` | `IvrInboundController@getIVR` |
| TODO | M7 | POST | `/api/v1/ivr_inbound/addEditIVRForIVRInbound` | `IvrInboundController@addEditIVRForIVRInbound` |

### 4.11. Export routes

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| DEFERRED | M8 | GET | `/api/v1/export/{fileName}` | `ExportController@download` |
| DEFERRED | M8 | GET | `/api/v1/exportExample/{type}` | `ExportController@exportExample` |

### 4.12. Connector routes

Connector routes must use `JwtOrHeaderGuard` with Laravel-compatible permissive behavior.

| Status | Phase | Method | Path | Laravel source |
| --- | --- | --- | --- | --- |
| TODO | M9 | GET | `/api/connector/groupBySecret/{secret?}` | `GroupsController@getGroupBySecret` |
| TODO | M9 | POST | `/api/connector/usersByExt` | `UsersController@getUserInfoByExtension` |
| BLOCKED | M9 | POST | `/api/connector/cdr/getStaticCalls` | `CdrController@getStaticCalls` |
| BLOCKED | M9 | POST | `/api/connector/cdr/getCalls` | `CdrController@getCalls` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportBySummary` | `QueueLogController@reportBySummary` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportByQueues` | `QueueLogController@reportByQueues` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportDistributionDetailed` | `QueueLogController@reportDistributionDetailed` |
| BLOCKED | M9 | GET | `/api/connector/queuelog/reportDistributionDetailedByCallid/{callid}` | `QueueLogController@reportDistributionDetailedByCallid` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/getQueueLog` | `QueueLogController@getQueueLog` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredServiceLevel` | `QueueLogController@reportAnsweredServiceLevel` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredByQueues` | `QueueLogController@reportAnsweredByQueues` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredByAgents` | `QueueLogController@reportAnsweredByAgents` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredByQueuesAgents` | `QueueLogController@reportAnsweredByQueuesAgents` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredDisconnectionCause` | `QueueLogController@reportAnsweredDisconnectionCause` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredByCallLength` | `QueueLogController@reportAnsweredByCallLength` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAnsweredCallsDetail` | `QueueLogController@reportAnsweredCallsDetail` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportTransfer` | `QueueLogController@reportTransfer` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportByYear` | `QueueLogController@reportByYear` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportServiceCallCenter` | `QueueLogController@reportServiceCallCenter` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportKPI` | `QueueLogController@reportKPI` |
| DEFERRED | M8 | POST | `/api/connector/queuelog/exportCustomData` | `QueueLogController@exportCustomData` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAbandonServiceLevel` | `QueueLogController@reportAbandonServiceLevel` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportUnAnsweredDisconnectionCause` | `QueueLogController@reportUnAnsweredDisconnectionCause` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportUnAnsweredByQueues` | `QueueLogController@reportUnAnsweredByQueues` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportRingNoAnsweredByAgents` | `QueueLogController@reportRingNoAnsweredByAgents` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportUnAnsweredCallsDetail` | `QueueLogController@reportUnAnsweredCallsDetail` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAgentAvailability` | `QueueLogController@reportAgentAvailability` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAgentSessionAndPause` | `QueueLogController@reportAgentSessionAndPause` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportRecallsOnAnsweredCalls` | `QueueLogController@reportRecallsOnAnsweredCalls` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportListOfRecallClusters` | `QueueLogController@reportListOfRecallClusters` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportCallsDetailByCallerIds` | `QueueLogController@reportCallsDetailByCallerIds` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportRecallDetailsOnAnsweredCalls` | `QueueLogController@reportRecallDetailsOnAnsweredCalls` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportDistributionQueuesByDate` | `QueueLogController@reportDistributionQueuesByDate` |
| DEFERRED | M8 | POST | `/api/connector/queuelog/exportExcel` | `QueueLogController@exportReportQueue` |
| DEFERRED | M8 | POST | `/api/connector/queuelog/exportReport` | `QueueLogController@exportReport` |
| DEFERRED | M8 | POST | `/api/connector/queuelog/exportReportv2` | `QueueLogController@exportReport` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportQueueAgentAction` | `QueueLogController@reportQueueAgentAction` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportDetailAgentAction` | `QueueLogController@reportDetailAgentAction` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportQueueAgentKPI` | `QueueLogController@reportQueueAgentKPI` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportDetailAgent` | `QueueLogController@reportDetailAgent` |
| DEFERRED | M8 | POST | `/api/connector/queuelog/exportQueueLogDetail` | `QueueLogController@exportQueueLogDetail` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportSummaryAgentAction` | `QueueLogController@reportSummaryAgentAction` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportQueueLogMissCall` | `QueueLogController@reportQueueLogMissCall` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportQueueLogMissCallDetail` | `QueueLogController@reportQueueLogMissCallDetail` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportQueueLogMissCallToday` | `QueueLogController@reportQueueLogMissCallToday` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportSummaryQueueLogMissCallToday` | `QueueLogController@reportSummaryQueueLogMissCallToday` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/updateQueueLogMissCallToday` | `QueueLogController@updateQueueLogMissCallToday` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAgentKPI` | `QueueLogController@reportAgentKPI` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAgentSummary` | `QueueLogController@reportAgentSummary` |
| BLOCKED | M9 | POST | `/api/connector/queuelog/reportAgentKPIByDate` | `QueueLogController@reportAgentKPIByDate` |

## 5. Module-by-module execution plan

### M0 - Bootstrap

Deliverables:

- NestJS app scaffolded in target repo.
- `.env.example` with placeholders only.
- `DatabaseModule` for `main`, `voice`, `pbx`.
- `JwtAuthGuard`, `JwtOrHeaderGuard`.
- Laravel-compatible exception filter.
- Route prefix `/api`.
- `/api/v1/hello2` implemented.

Exit criteria:

- `npm run build` pass.
- App starts and connects to main DB.
- No secrets committed.

### M1 - Auth/User

Use `migration-guide/8_AUTH_USER_CHECKLIST.md` as the detailed tracker.

Exit criteria:

- All M1 `TODO` routes pass Postman parity.
- M1 blocked/deferred routes have documented reason and required input.

### M2 - UserType/Permission

Implement:

- User type CRUD.
- Privilege create/update/delete/duplicate behavior.
- Duplicate `deleteUserTypes` runtime behavior check.

Exit criteria:

- User type listing, detail, insert, update, delete, bulk delete match Laravel.
- Duplicate route behavior documented and implemented as observed.

### M3 - Groups/Departments

Implement in this order:

1. Public read-by-secret endpoints.
2. Group list/detail/hotline/module reads.
3. Department reads.
4. Group write/delete/duplicate.
5. Hotline/module writes.
6. Department writes.
7. Config writes: webhook, SMS, dashboard, campaign process.

Exit criteria:

- Read endpoints match Laravel.
- Write endpoints preserve soft-delete/status/history behavior.
- PBX-affecting logic is either matched or marked blocked with exact missing dependency.

### M4 - Customers

Do not start until blocker is resolved.

When unblocked, implement:

1. Customer list/detail/latest/by phone.
2. Customer create/update/delete/duplicate.
3. Custom fields/view/data.
4. Tags.
5. ACBS/Zalo variants.
6. Import/export customer in M8.

Exit criteria:

- All customer routes pass Postman parity.
- Missing source reconstruction is documented per endpoint.

### M5 - CDR

Do not start advanced reports until voice schema is available.

When unblocked, implement:

1. Table-selection helper for `cdr`, `cdr_monthly`, `cdr_yearly`.
2. Shared date/filter/agent/queue helpers.
3. Public CDR reads.
4. JWT report endpoints.
5. Billing/provider reports.
6. Export endpoints in M8.

Exit criteria:

- CDR queries match Laravel row counts and aggregate totals for same Postman request.
- All raw SQL uses prepared params except whitelisted table names.

### M6 - QueueLog

Do not start until voice schema is available.

When unblocked, implement:

1. Table-selection helper for `queue_log`, `queue_log_monthly`, `queue_log_yearly`.
2. QueueLog v1 protected endpoints.
3. No-answer update cron endpoint.
4. Connector queue reports in M9.
5. Export endpoints in M8.

Exit criteria:

- Aggregates match Laravel for same date/queue/agent filters.
- Runtime cost is acceptable for large report ranges.

### M7 - IVR inbound

Implement in this order:

1. DID read/list.
2. Recording read/list.
3. Inbound route read.
4. Time condition/time group reads.
5. IVR read/tree.
6. Add/edit DID, record, route, time condition, time group, IVR.
7. `getAndPlayRecord`.
8. PBX/cURL side effects.

Exit criteria:

- CRUD matches Laravel.
- PBX side effects have timeout/error mapping matching Laravel behavior.
- `data_history` writes match where Laravel writes history.

### M8 - Export/import/files/cron

Implement after backing data APIs are correct:

- Export/download routes.
- Excel exports for users, customers, CDR, QueueLog, privilege.
- Excel imports for users, customers, blacklist.
- Export examples/templates.
- Public cron/file cleanup endpoints.

Exit criteria:

- File names, URLs, storage paths, content type and response body match Laravel.
- Large export does not load excessive memory.

### M9 - Connector

Implement connector after underlying services exist:

1. Group connector endpoint.
2. User connector endpoint.
3. CDR connector endpoints.
4. QueueLog connector endpoints.
5. Connector export endpoints via M8 export service.

Exit criteria:

- `JwtOrHeaderGuard` matches Laravel permissive behavior.
- Connector responses match Laravel with and without JWT/custom header.

### M10 - Hardening and cutover readiness

Tasks:

- Run full Postman collection against Laravel baseline and NestJS.
- Produce parity report.
- Ensure `npm run build` pass.
- Ensure no secrets in git.
- Document all remaining `BLOCKED` routes with exact dependency.
- Prepare cutover checklist.

Exit criteria:

- All non-blocked active routes are `DONE`.
- All blocked routes have owner/input needed.
- Frontend/Postman smoke test passes.

## 6. Acceptance template per endpoint

Use this template in migration log:

```text
ENDPOINT:
- Status:
- Phase:
- Method/path:
- Laravel controller:
- NestJS module/service:
- Auth:
- Request sample:
- Tables read:
- Tables written:
- Side effects:
- Laravel status/body:
- NestJS status/body:
- Notes/blockers:
```

## 7. Definition of done for full API migration

Full migration is complete only when:

- All active `routes/api.php` endpoints are `DONE`, or explicitly `BLOCKED` with missing source/schema/sample.
- Full Postman collection passes against NestJS.
- Laravel and NestJS parity report is accepted.
- `npm run build` passes.
- No secret values are committed.
- No unrelated route/API changes are introduced.
- Cutover rollback plan exists.
