import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_types" })
export class UserTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 250 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @Column({ name: "groupId", type: "int", nullable: true })
  groupId: number | null;

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
