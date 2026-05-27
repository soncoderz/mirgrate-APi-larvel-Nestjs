# 🧹 Hướng Dẫn Cleanup Code

## Bước 1: Cleanup Duplicate Constants (15 phút)

### 1.1. Mở file `src/modules/users/users.service.ts`

### 1.2. Xóa các dòng duplicate (lines 41-159)

Xóa toàn bộ section này:
```typescript
// ❌ XÓA SECTION NÀY
/** Type alias cho database row kết quả query dạng key-value */
export type DbRow = Record<string, any>;

export type AuthPayload = {
  sub?: number;
  id?: number;
  email?: string;
  role?: string;
  groupId?: number;
  typeId?: number;
};

export const USER_SAFE_SELECT = `...`;
export const USER_MUTABLE_COLUMNS = new Set([...]);
export const USER_TABLE_COLUMNS = new Set([...]);
export const USER_FILTER_TYPES = new Set([...]);
```

### 1.3. Thêm import ở đầu file

Thêm dòng này vào phần imports:
```typescript
import {
  DbRow,
  AuthPayload,
  USER_SAFE_SELECT,
  USER_MUTABLE_COLUMNS,
  USER_TABLE_COLUMNS,
  USER_FILTER_TYPES,
} from './users.constants';
```

### 1.4. Test

```bash
npm run build
npm run start:dev
```

---

## Bước 2: Inject Repository Services (4-6 giờ)

### 2.1. Update UsersService Constructor

Mở `src/modules/users/users.service.ts` và update constructor:

```typescript
import {
  UserTypeRepository,
  UserPrivilegeRepository,
  GroupHotlineRepository,
  DepartmentRepository,
  IpLockRepository,
  UserConfigRepository,
  JntUserAccessScopeRepository,
  QrcodeMifoneRepository,
  DataHistoryRepository,
} from './repositories';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    
    // Inject repository services
    private readonly userTypeRepo: UserTypeRepository,
    private readonly privilegeRepo: UserPrivilegeRepository,
    private readonly groupHotlineRepo: GroupHotlineRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly ipLockRepo: IpLockRepository,
    private readonly userConfigRepo: UserConfigRepository,
    private readonly jntScopeRepo: JntUserAccessScopeRepository,
    private readonly qrcodeRepo: QrcodeMifoneRepository,
    private readonly dataHistoryRepo: DataHistoryRepository,
    
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: JwtBlacklistService,
  ) {}
}
```

### 2.2. Refactor Methods

#### A. getUserType()
```typescript
// ❌ Before (Raw SQL)
private async getUserType(id: number) {
  const rows = await this.entityManager.query(
    "SELECT * FROM user_types WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

// ✅ After (TypeORM)
private async getUserType(id: number) {
  return this.userTypeRepo.findById(id);
}
```

#### B. getGroupHotline()
```typescript
// ❌ Before (Raw SQL)
private async getGroupHotline(groupId: number) {
  return this.entityManager.query(
    `SELECT ... FROM group_hotline WHERE groupId = ? AND status = 'publish'`,
    [groupId],
  );
}

// ✅ After (TypeORM)
private async getGroupHotline(groupId: number) {
  return this.groupHotlineRepo.findByGroupId(groupId);
}
```

#### C. getUserPermissions()
```typescript
// ❌ Before (Raw SQL)
private async getUserPermissions(typeId?: number) {
  if (!typeId) return [];
  const rows = await this.entityManager.query(
    `SELECT page, GROUP_CONCAT(action) AS permission
     FROM user_privileges WHERE user_type_id = ? AND status = 'publish'
     GROUP BY page`,
    [typeId],
  );
  return rows.flatMap(...);
}

// ✅ After (TypeORM)
private async getUserPermissions(typeId?: number) {
  if (!typeId) return [];
  return this.privilegeRepo.findByUserTypeId(typeId);
}
```

#### D. lockIp()
```typescript
// ❌ Before (Raw SQL)
private async lockIp(ip: string) {
  const rows = await this.entityManager.query(
    "SELECT id FROM ip_lock WHERE ip_client = ? LIMIT 1",
    [ip],
  );
  if (rows[0]) {
    await this.entityManager.query(
      "UPDATE ip_lock SET lock_time = ? WHERE id = ?",
      [this.unixNow(), rows[0].id],
    );
    return;
  }
  await this.entityManager.query(
    "INSERT INTO ip_lock (ip_client, lock_time) VALUES (?, ?)",
    [ip, this.unixNow()],
  );
}

// ✅ After (TypeORM)
private async lockIp(ip: string) {
  const existing = await this.ipLockRepo.findByIp(ip);
  if (existing) {
    await this.ipLockRepo.updateLockTime(existing.id, this.unixNow());
    return;
  }
  await this.ipLockRepo.create(ip, this.unixNow());
}
```

#### E. syncJntUserAccessScopes()
```typescript
// ❌ Before (Raw SQL)
private async syncJntUserAccessScopes(userId: number, body: Record<string, any>) {
  const scopes = { ... };
  for (const [type, rawIds] of Object.entries(scopes)) {
    await this.entityManager.query(
      "DELETE FROM jnt_user_access_scopes WHERE user_id = ? AND scope_type = ?",
      [userId, type],
    );
    for (const scopeId of this.normalizeScopeIds(rawIds)) {
      await this.entityManager.query(
        "INSERT INTO jnt_user_access_scopes ...",
        [userId, type, scopeId],
      );
    }
  }
}

// ✅ After (TypeORM)
private async syncJntUserAccessScopes(userId: number, body: Record<string, any>) {
  await this.jntScopeRepo.syncScopes(userId, {
    list_region: body.list_region,
    list_branch: body.list_branch,
    list_department: body.list_department,
  });
}
```

#### F. upsertUserConfig()
```typescript
// ❌ Before (Raw SQL)
private async upsertUserConfig(userId: number, body: any, currentUserId?: number) {
  const rows = await this.entityManager.query(
    "SELECT userid FROM user_config WHERE userid = ? LIMIT 1",
    [userId],
  );
  if (rows[0]) {
    await this.entityManager.query("UPDATE user_config SET ...", [...]);
  } else {
    await this.entityManager.query("INSERT INTO user_config ...", [...]);
  }
}

// ✅ After (TypeORM)
private async upsertUserConfig(userId: number, body: any, currentUserId?: number) {
  await this.userConfigRepo.upsert(userId, {
    is_hotdesk: body.is_hotdesk,
    transports: body.transports,
    port: body.port,
  }, currentUserId);
}
```

#### G. updateDepartmentExtension()
```typescript
// ❌ Before (Raw SQL)
private async updateDepartmentExtension(body: any) {
  if (!body.departmentId || !body.extension) return;
  
  const departments = await this.entityManager.query(
    "SELECT id, extensions FROM departments WHERE id = ? LIMIT 1",
    [body.departmentId],
  );
  
  // ... complex logic ...
  
  await this.entityManager.query(
    "UPDATE departments SET extensions = ? WHERE id = ?",
    [JSON.stringify(extensions), department.id],
  );
}

// ✅ After (TypeORM)
private async updateDepartmentExtension(body: any) {
  if (!body.departmentId || !body.extension) return;
  
  const department = await this.departmentRepo.findById(body.departmentId);
  if (!department) return;
  
  // ... same logic ...
  
  await this.departmentRepo.updateExtensions(department.id, JSON.stringify(extensions));
}
```

#### H. insertUpdateUserHistory() & insertUserHistory()
```typescript
// ❌ Before (Raw SQL)
private async insertUpdateUserHistory(...) {
  await this.entityManager.query(
    "INSERT INTO data_history (action, action_type, ...) VALUES (?, ?, ...)",
    [action, "user", dataChange, currentUser.id, newUser.groupId, text],
  );
}

// ✅ After (TypeORM)
private async insertUpdateUserHistory(...) {
  await this.dataHistoryRepo.create({
    action,
    action_type: "user",
    data_change: dataChange,
    created_by: currentUser.id,
    groupId: newUser.groupId,
    text,
  });
}
```

### 2.3. Test Từng Method

Sau mỗi refactor, test endpoint tương ứng:

```bash
# Test login
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test getUsers
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recordsOnPage":10,"page":1}'

# Test updateUser
curl -X POST http://localhost:3000/api/v1/updateUser \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":1,"firstName":"Updated"}'
```

---

## Bước 3: Refactor @CurrentUser Decorator (1 giờ)

### 3.1. Update users.controller.ts

```typescript
// ❌ Before
@Get('me')
@UseGuards(JwtAuthGuard)
me(@Req() request: RequestWithUser) {
  return this.users.me(this.parseRequestUser(request));
}

// ✅ After
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthPayload } from './users.constants';

@Get('me')
@UseGuards(JwtAuthGuard)
me(@CurrentUser() user: AuthPayload) {
  return this.users.me(user);
}
```

### 3.2. Remove parseRequestUser()

Xóa method này khỏi controller:
```typescript
// ❌ XÓA METHOD NÀY
private parseRequestUser(request: RequestWithUser) {
  return request.user
    ? (this.requestUserPipe.transform(request.user) as Record<string, unknown>)
    : undefined;
}
```

### 3.3. Update Tất Cả Methods

Apply pattern tương tự cho:
- `getUsers()`
- `updateUser()`
- `addUserAsMemberOfCompany()`

---

## Bước 4: Quyết Định Unused Services (1 giờ)

### Option A: Xóa QueryHelperService

```bash
# 1. Remove from common.module.ts
# 2. Delete file
rm src/common/services/query-helper.service.ts
```

### Option B: Sử Dụng QueryHelperService

```typescript
// In users.service.ts
constructor(
  // ...
  private readonly queryHelper: QueryHelperService,
) {}

// Use in getUsers()
const pagination = this.queryHelper.toPagination(body);
```

### Tương tự cho DateHelperService

---

## Bước 5: Final Checks

### 5.1. Run Build
```bash
npm run build
```

### 5.2. Run Tests (nếu có)
```bash
npm run test
```

### 5.3. Check Unused Imports
```bash
npx eslint src --ext .ts --fix
```

### 5.4. Format Code
```bash
npx prettier --write "src/**/*.ts"
```

---

## 📊 Checklist

- [ ] Cleanup duplicate constants
- [ ] Inject repository services
- [ ] Refactor getUserType()
- [ ] Refactor getGroupHotline()
- [ ] Refactor getUserPermissions()
- [ ] Refactor lockIp()
- [ ] Refactor syncJntUserAccessScopes()
- [ ] Refactor upsertUserConfig()
- [ ] Refactor updateDepartmentExtension()
- [ ] Refactor insertUpdateUserHistory()
- [ ] Refactor insertUserHistory()
- [ ] Update @CurrentUser decorator usage
- [ ] Remove parseRequestUser()
- [ ] Quyết định QueryHelperService
- [ ] Quyết định DateHelperService
- [ ] Run build
- [ ] Test all endpoints
- [ ] Format code
- [ ] Update documentation

---

## 🎉 Kết Quả Mong Đợi

Sau khi hoàn thành:
- ✅ 0 duplicate code
- ✅ 0 raw SQL queries
- ✅ 100% TypeORM
- ✅ Clean architecture
- ✅ Type-safe
- ✅ Easy to maintain
