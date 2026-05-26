/**
 * =============================================================================
 * database.tokens.ts - Injection Tokens cho các kết nối database
 * =============================================================================
 *
 * Trong NestJS, Dependency Injection sử dụng "token" để phân biệt các
 * provider cùng kiểu. Ở đây, cả 3 kết nối database đều có kiểu Pool (mysql2),
 * nên cần token riêng biệt để NestJS biết inject đúng pool.
 *
 * Symbol() tạo một giá trị duy nhất, không trùng lặp, dùng làm DI token.
 *
 * Tương đương với tên connection trong config/database.php của Laravel:
 * - MAIN_DB  → connection 'mysql' (default)
 * - VOICE_DB → connection 'voice_server_1'
 * - PBX_DB   → connection PBX
 */

/** Token cho kết nối database chính - chứa users, groups, customers, ... */
export const MAIN_DB = Symbol("MAIN_DB");

/** Token cho kết nối Voice Server - chứa CDR, QueueLog (dữ liệu cuộc gọi) */
export const VOICE_DB = Symbol("VOICE_DB");

/** Token cho kết nối PBX (Private Branch Exchange) - cấu hình tổng đài */
export const PBX_DB = Symbol("PBX_DB");
