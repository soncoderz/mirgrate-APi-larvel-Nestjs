# GET /api/v1/user/{id}

Controller: `UsersController@getUserByID($userId)`

Middleware: `api`, `jwt.auth`

## Flow

```mermaid
flowchart TD
  A[Client GET /api/v1/user/:id] --> B[jwt.auth middleware]
  B --> C[UsersController.getUserByID]
  C --> D[Query users where status <> trash and id = userId]
  D --> E[with userType, userGroup]
  E --> F{Co record?}
  F -->|Khong| G[Helper::errorResponse user_id_not_exist, 406]
  F -->|Co| H[Tra user first]
```

## Output Thành Công

```json
{
  "id": 1,
  "email": "superadmin@mipbx.vn",
  "userType": {},
  "userGroup": {}
}
```

## Ghi Chú

- Method không check user hiện tại có quyền xem `userId` này hay không.
- Chỉ loại `status = trash`.
