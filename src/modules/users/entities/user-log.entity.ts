import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users_log" })
export class UserLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "groupid", type: "int", nullable: true })
  groupId: number | null;

  @Column({ type: "varchar", length: 50 })
  username: string;

  @Column({ type: "varchar", length: 50 })
  password: string;

  @Column({ type: "varchar", length: 15, nullable: true })
  ip_address: string | null;

  @Column({ type: "enum", enum: ["fail", "sign-in", "sign-out"], nullable: true })
  status: "fail" | "sign-in" | "sign-out" | null;

  @Column({ type: "int", nullable: true })
  sign_in_time: number | null;

  @Column({ type: "int", nullable: true })
  sign_out_time: number | null;

  @Column({ type: "timestamp", nullable: true })
  created_at: string | null;

  @Column({ type: "int", nullable: true })
  created_by: number | null;

  @Column({ type: "timestamp", nullable: true })
  updated_at: string | null;

  @Column({ type: "int", nullable: true })
  updated_by: number | null;
}
