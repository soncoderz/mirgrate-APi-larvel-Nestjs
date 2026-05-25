import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Group entity - tương đương App\Models\Group trong Laravel
 */
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  secret: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 1 })
  status: number;

  @Column({ nullable: true })
  webhook_url: string;

  @Column({ nullable: true })
  config: string; // JSON config

  @CreateDateColumn({ name: 'created_at', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
