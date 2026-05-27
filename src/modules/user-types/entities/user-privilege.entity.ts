import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_privileges" })
export class UserPrivilegeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "typeId", type: "int", nullable: true })
  typeId: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  action: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  page: string | null;

  @Column({ type: "enum", enum: ["trash", "publish"], default: "publish" })
  status: "trash" | "publish";

  @Column({ type: "datetime", nullable: true })
  created_at: string | null;

  @Column({ type: "int", nullable: true })
  created_by: number | null;

  @Column({ type: "timestamp", nullable: true })
  updated_at: string | null;

  @Column({ type: "int", nullable: true })
  updated_by: number | null;
}
