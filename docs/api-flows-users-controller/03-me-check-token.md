# GET /api/v1/me Và POST /api/v1/checkToken

Controller thực tế:

- `GET /api/v1/me` -> `UsersController@me`
- `POST /api/v1/checkToken` -> `UsersController@me`

Lưu ý: method `checkToken(Request $request)` vẫn tồn tại trong controller, nhưng route hiện tại không gọi method đó.

## Input Chính

Với `/api/v1/me`:

```http
Authorization: Bearer <token>
```

Với `/api/v1/checkToken`, route đang gọi `me()`, nên cũng dùng token theo cách `JWTAuth::parseToken()`, thường là Authorization header:

```http
Authorization: Bearer <token>
```

## Flow

```mermaid
flowchart TD
  A[Client] --> B{Route}
  B -->|GET /api/v1/me| C[jwt.auth middleware]
  C --> D[UsersController.me]
  B -->|POST /api/v1/checkToken| D
  D --> E[JWTAuth::parseToken()->authenticate]
  E -->|Thanh cong va co user| F[Tra message Success code 200]
  E -->|Khong co user| G[Tra User not found code 401, HTTP 200]
  E -->|TokenExpiredException| H[Tra Token has expired code 401, HTTP 200]
  E -->|TokenInvalidException| I[Tra Token is invalid code 401, HTTP 200]
  E -->|JWTException khac| J[Tra Token is missing code 401, HTTP 200]
```

## Output

Thành công:

```json
{
  "message": "Success",
  "code": 200
}
```

Token lỗi:

```json
{
  "message": "Token is invalid",
  "code": 401
}
```

## Ghi Chú

- `me()` luôn trả HTTP 200 cho các lỗi token trong catch, nhưng body có `code = 401`.
- `/api/v1/checkToken` không dùng body `{ "token": "..." }` theo route hiện tại, vì route đang map vào `me()`.
