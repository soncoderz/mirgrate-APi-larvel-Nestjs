# POST /api/v1/login

Controller: `UsersController@login(Request $request)`

## Input Chính

```json
{
  "email": "superadmin@mipbx.vn",
  "password": "Mitek123#$",
  "remember_token": true
}
```

## Flow

```mermaid
flowchart TD
  A[Client POST /api/v1/login] --> B[UsersController.login]
  B --> C[Lay client IP]
  C --> D[Tao UserLog tam: username, ip_address, password]
  D --> E{Tim user theo email}
  E -->|Khong co| F[handleLoginFail]
  F --> R1[Tra loi loi credentials]
  E -->|Co user| G[JWTAuth::attempt email password]
  G -->|Sai password| H[handleInvalidPassword]
  H --> R2[Tra loi loi credentials]
  G -->|Dung password| I[JWTAuth::attempt them status active]
  I -->|Khong active| J[UserLog fail + Error_Pending_Account]
  I -->|Active| K[JWTAuth::setToken token -> toUser]
  K --> L[Lay group theo groupId]
  L --> M{Group bi lock?}
  M -->|Co| N[Tra loi Login failed]
  M -->|Khong| O[Cap nhat UserLog sign-in]
  O --> P[processPrivileges]
  P --> Q[Update user lastLogin, isOnline = 1]
  Q --> S[getQueueAndAgents]
  S --> T[Lay group_hotline publish]
  T --> U[Gan socket_url, recording_url tu config]
  U --> V[Tra success: token, user, group, privilege, user_log, queue_name, agents_view]
```

## Output Thành Công

```json
{
  "success": {
    "token": "...",
    "user": {},
    "group": {},
    "group_hotline": [],
    "privilege": [],
    "user_log": {},
    "queue_name": {},
    "agents_view": {}
  }
}
```

## Ghi Chú

- Route login không nằm trong `jwt.auth`.
- Login ghi `users_log`.
- Nếu `remember_token` có giá trị, token được set hạn dài hơn bằng custom claim `exp`.
