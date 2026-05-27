import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "groups" })
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  groupName: string | null;

  @Column({ type: "enum", enum: ["trash", "publish", "active", "lock"], nullable: true })
  status: "trash" | "publish" | "active" | "lock" | null;

  @Column({ type: "int", nullable: true })
  limitUser: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  socket_url: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  recording_url: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  connector_server: string | null;

  @Column({ type: "text", nullable: true })
  did: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  contextout: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  secret: string | null;

  @Column({ type: "mediumtext", nullable: true })
  config: string | null;

  @Column({ type: "mediumtext", nullable: true })
  config_dashboard: string | null;

  @Column({ type: "mediumtext", nullable: true })
  sms_config: string | null;

  @Column({ type: "datetime", nullable: true })
  created_at: string | null;

  @Column({ type: "int", nullable: true })
  created_by: number | null;

  @Column({ type: "timestamp", nullable: true })
  updated_at: string | null;

  @Column({ type: "int", nullable: true })
  updated_by: number | null;
}
