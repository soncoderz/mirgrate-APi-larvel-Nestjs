# POST /api/v1/updateUser

Controller: `UsersController@updateUser(Request $request)`

Middleware: `api`, `jwt.auth`

## Input Ví Dụ

```json
{
  "id": 1,
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "phone": "011111111111",
  "groupId": 1,
  "status": "active",
  "role": "agent",
  "extension": "1001"
}
```

## Flow

```mermaid
flowchart TD
  A[Client POST /api/v1/updateUser] --> B[jwt.auth middleware]
  B --> C[UsersController.updateUser]
  C --> D[userId = request.id]
  D --> E[Lay params = request all]
  E --> F[Loai key null tru avatar/id/extensions_view/queues/extension]
  F --> G[Helper::checkParams voi rules]
  G -->|Invalid| H[Tra code 406 Invalid parameters]
  G -->|Valid| I[User::find userId]
  I --> J{Co user?}
  J -->|Khong| K[Helper::errorResponse user_id_not_exist]
  J -->|Co| L[Clone old_user]
  L --> M{Neu user chua active va request active}
  M -->|Co| N[Check group limitUser]
  N -->|Full| O[Tra group_full 406]
  M -->|Khong hoac ok| P[Loop params de gan field chung]
  N -->|Ok| P
  P --> Q[Hash password neu co]
  Q --> R[Gan field rieng: firstName, phone, mobile, address, note, otherId, otherEmail, is_google2fa]
  R --> S[Gan queues/extension/extensions_view neu co]
  S --> T[Xoa va tao lai JnTUserAccessScopes]
  T --> U{Co avatar file?}
  U -->|Co| V[Validate ext, move file, set avatar]
  U -->|Khong| W[Bo qua avatar]
  V --> X[Set updated_at, updated_by]
  W --> X
  X --> Y[user save]
  Y --> Z[Upsert UserConfig hotdesk/transports/port]
  Z --> AA{Save ok?}
  AA -->|Khong| AB[Helper::errorResponse update_error]
  AA -->|Co| AC[Insert DataHistory update]
  AC --> AD{Co departmentId va extension?}
  AD -->|Co| AE[Cap nhat departments.extensions]
  AD -->|Khong| AF[Bo qua department]
  AE --> AG[Tra success + user]
  AF --> AG
```

## Output Thành Công

```json
{
  "success": true,
  "user": {}
}
```

## Ghi Chú

- Laravel không check quyền sửa user khác trong method này. Chỉ cần qua `jwt.auth`.
- Nếu request không gửi một số field, code Laravel vẫn set một vài field về rỗng/null như `firstName`, `phone`, `mobile`, `address`, `note`.
- Scope `region/branch/department` bị xóa và tạo lại theo request.
