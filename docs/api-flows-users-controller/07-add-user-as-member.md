# POST /api/v1/addUserAsMemberOfCompany

Controller: `UsersController@addUserAsMemberOfCompany(Request $request)`

Middleware: `api`, `jwt.auth`

## Input Ví Dụ

```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "Mitek123#$",
  "confirmPassword": "Mitek123#$",
  "groupId": 1,
  "status": "active",
  "role": "agent",
  "extension": "1001",
  "typeId": 1
}
```

## Flow

```mermaid
flowchart TD
  A[Client POST /api/v1/addUserAsMemberOfCompany] --> B[jwt.auth middleware]
  B --> C[UsersController.addUserAsMemberOfCompany]
  C --> D[Helper::checkParams voi rules]
  D -->|Invalid| E[Tra code 406 Invalid parameters]
  D -->|Valid| F[Group::find request.groupId]
  F --> G{Group ton tai?}
  G -->|Khong| H[group_not_exist 406]
  G -->|Co| I[Dem user active trong group]
  I --> J{Count == group.limitUser?}
  J -->|Co| K[group_full 406]
  J -->|Khong| L[new User]
  L --> M[getUserId tu JWT de set created_by]
  M --> N[Gan firstName, lastName, status, mobile, phone, email, password hash, address, note, role]
  N --> O[Gan groupId, extension, extensions_view, departmentId, queues, typeId, loginType, created_at]
  O --> P{type_user == midesk?}
  P -->|Co| Q[Tu tinh userCode theo userCode cu]
  P -->|Khong| R[userCode = request.userCode hoac time]
  Q --> S[Gan otherId, otherEmail, firstLogin, is_google2fa]
  R --> S
  S --> T[user save]
  T --> U[DB BEFORE INSERT trigger co the ghi de userCode]
  U --> V[Xoa va tao JnTUserAccessScopes]
  V --> W{Co emailqr?}
  W -->|Co| X[Insert QRCodeMifone]
  W -->|Khong| Y[Bo qua QR]
  X --> Z[Insert DataHistory action insert]
  Y --> Z
  Z --> AA{Co avatar file?}
  AA -->|Co| AB[Validate ext, move file, save avatar]
  AA -->|Khong| AC[Bo qua avatar]
  AB --> AD{Co user id?}
  AC --> AD
  AD -->|Khong| AE[Server problem 500]
  AD -->|Co| AF{Co departmentId va extension?}
  AF -->|Co| AG[Cap nhat departments.extensions]
  AF -->|Khong| AH[Bo qua department]
  AG --> AI[Tra success id]
  AH --> AI
```

## Output Thành Công

```json
{
  "success": {
    "id": 123
  }
}
```

## Ghi Chú

- `id` do MySQL `AUTO_INCREMENT` cấp, không đảm bảo liên tục.
- `userCode` trong PHP có thể bị DB trigger `BEFORE INSERT users` ghi đè.
- DB có unique key `(userCode, groupId)`, nên nếu trigger sinh trùng mã sẽ lỗi `Duplicate entry`.
- Method không dùng transaction, nên nếu lỗi sau `user->save()`, các bước trước đó có thể đã ghi DB.
