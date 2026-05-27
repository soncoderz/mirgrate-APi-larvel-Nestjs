# POST /api/v1/logout

Controller: `UsersController@logout(Request $request)`

## Input Chính

Header:

```http
Authorization: Bearer <token>
```

Body thường dùng:

```json
{
  "id": 123
}
```

Trong đó `id` là id bản ghi `users_log`, không phải `users.id`.

## Flow

```mermaid
flowchart TD
  A[Client POST /api/v1/logout] --> B[UsersController.logout]
  B --> C[auth()->user]
  C --> D[Tim UserLog theo request.id]
  D --> E{Co user_log?}
  E -->|Co| F{Co auth user?}
  F -->|Co| G{User co remember_token?}
  G -->|Co| H[JWTAuth::invalidate remember_token]
  G -->|Khong| I[Set remember_token = null]
  H --> I
  I --> J[Save user]
  F -->|Khong| K[Bo qua user save]
  E -->|Khong| L[Bo qua user_log]
  J --> M{user_log.status == sign-in?}
  K --> M
  M -->|Co| N[Set status sign-out, sign_out_time = time, save]
  M -->|Khong| O[Bo qua]
  L --> P[JWTAuth::getToken tu Authorization]
  N --> P
  O --> P
  P --> Q{Co token?}
  Q -->|Khong| R[400 Token khong ton tai]
  Q -->|Co| S[JWTAuth::invalidate token hien tai]
  S --> T[200 Logout success]
  S -->|JWTException| U[200 Khong the dang xuat token co the het han]
```

## Output Thành Công

```json
{
  "message": "Logout success",
  "code": 200
}
```

## Ghi Chú

- Route `/api/v1/logout` hiện nằm ngoài group `jwt.auth`, nhưng method vẫn tự lấy token từ header bằng `JWTAuth::getToken()`.
- Nếu body `id` không phải id `users_log`, phần cập nhật log sẽ bị bỏ qua.
