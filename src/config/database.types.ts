/**
 * =============================================================================
 * database.types.ts - Type definitions cho hệ thống database
 * =============================================================================
 *
 * Định nghĩa các kiểu TypeScript cho hệ thống kết nối multi-database.
 */

/**
 * DatabaseConnectionName - Tên các kết nối database có sẵn
 *
 * - 'main'  → Database chính (users, groups, customers, ...)
 * - 'voice' → Database Voice Server (CDR, QueueLog - dữ liệu cuộc gọi)
 * - 'pbx'   → Database PBX (cấu hình tổng đài SIP, extension, ...)
 *
 * Sử dụng khi gọi DatabaseService:
 * this.database.query('main', 'SELECT ...') → query vào main DB
 * this.database.query('voice', 'SELECT ...') → query vào voice DB
 */
export type DatabaseConnectionName = "main" | "voice" | "pbx";
