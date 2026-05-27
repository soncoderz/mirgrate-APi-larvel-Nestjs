# POST /api/v1/users

Controller: `UsersController@getUsers(Request $request)`

Middleware: `api`, `jwt.auth`

## Input Ví Dụ

```json
{
  "groupId": 1,
  "departmentId": 2,
  "typeId": 1,
  "roleId": "agent",
  "search": "test",
  "recordsOnPage": 10,
  "current_page": 1,
  "filters": [],
  "sorts": []
}
```

## Flow

```mermaid
flowchart TD
  A[Client POST /api/v1/users] --> B[jwt.auth middleware]
  B --> C[UsersController.getUsers]
  C --> D[Khoi tao query users + join departments, user_types, groups, qr_code, user_config]
  D --> E[users.status <> trash]
  E --> F{Current role la superadmin?}
  F -->|Khong| G{Request co groupId?}
  G -->|Co| H[Filter users.groupId = request.groupId]
  G -->|Khong| I[Lay groupId tu token]
  I --> J{groupId == 1?}
  J -->|Co| K[Chi lay users.id = current user id]
  J -->|Khong| L[Filter users.groupId = current groupId]
  F -->|Co| M{Request co groupId?}
  M -->|Co| N[Filter users.groupId = request.groupId]
  M -->|Khong| O[Khong filter group]
  H --> P[Filter departmentId/typeId/roleId neu co]
  K --> P
  L --> P
  N --> P
  O --> P
  P --> Q{Co search string?}
  Q -->|Co| R[Where firstName/lastName/email/extension/typeName/userCode]
  Q -->|Khong| S[Bo qua search]
  R --> T{Co filters array?}
  S --> T
  T -->|Co| U[Helper::eloquentFilter]
  T -->|Khong| V[Bo qua filter]
  U --> W{Co sorts array?}
  V --> W
  W -->|Co| X[Helper::eloquentSort]
  W -->|Khong| Y[Order by users.id DESC]
  X --> Z[Paginate recordsOnPage]
  Y --> Z
  Z --> AA[Tra paginator response]
```

## Output

Laravel trả trực tiếp paginator object của Eloquent.

## Ghi Chú

- Non-superadmin bị giới hạn dữ liệu theo `groupId` hoặc chính user hiện tại nếu `groupId == 1`.
- Có nguy cơ SQL injection ở đoạn `search` vì dùng `whereRaw` nối trực tiếp `$txt`.
