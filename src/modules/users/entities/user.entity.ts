import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "userCode", type: "varchar", length: 50, nullable: true })
  userCode: string | null;

  @Column({ type: "varchar", length: 50 })
  firstName: string;

  @Column({ type: "varchar", length: 50 })
  lastName: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  mobile: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  avatar: string | null;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string;

  @Column({ name: "typeId", type: "int", nullable: true })
  typeId: number | null;

  @Column({ name: "groupId", type: "int", nullable: true })
  groupId: number | null;

  @Column({ type: "datetime", nullable: true })
  lastLogin: string | null;

  @Column({ type: "varchar", length: 100, default: "website" })
  loginType: string;

  @Column({
    type: "enum",
    enum: ["active", "trash", "pending", "lock"],
    default: "pending",
  })
  status: "active" | "trash" | "pending" | "lock";

  @Column({ type: "varchar", length: 255, nullable: true })
  address: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  extension: string | null;

  @Column({ type: "text", nullable: true })
  extensions_view: string | null;

  @Column({ type: "text", nullable: true })
  agents_view: string | null;

  @Column({ type: "text", nullable: true })
  queues: string | null;

  @Column({ type: "text", nullable: true })
  queues_config: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  note: string | null;

  @Column({ type: "enum", enum: ["superadmin", "admin", "agent"], nullable: true })
  role: "superadmin" | "admin" | "agent" | null;

  @Column({ type: "int", default: 0 })
  isOnline: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  remember_token: string | null;

  @Column({ type: "datetime", nullable: false })
  created_at: string;

  @Column({ type: "int", nullable: true })
  created_by: number | null;

  @Column({ type: "timestamp", nullable: true })
  updated_at: string | null;

  @Column({ type: "int", nullable: true })
  updated_by: number | null;

  @Column({ type: "datetime", nullable: true })
  trashed_at: string | null;

  @Column({ type: "int", nullable: true })
  trashed_by: number | null;

  @Column({ name: "departmentId", type: "int", nullable: true })
  departmentId: number | null;

  @Column({ type: "int", default: 0 })
  queueDynamic: number;

  @Column({ type: "text", nullable: true })
  config: string | null;

  @Column({ type: "int", default: 0 })
  time_auto_resume: number;

  @Column({ type: "text", nullable: true })
  groups_view: string | null;

  @Column({ type: "int", default: 0 })
  firstLogin: number;

  @Column({ type: "tinyint", default: 0 })
  is_verify: number;

  @Column({ type: "enum", enum: ["active", "lock"], nullable: true })
  is_salesforce: "active" | "lock" | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  lock_time: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  otherId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  otherEmail: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  google2fa_secret: string | null;

  @Column({ type: "enum", enum: ["active", "disabled"], default: "disabled" })
  is_google2fa: "active" | "disabled";
}
