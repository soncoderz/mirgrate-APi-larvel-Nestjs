import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * UserLog entity - tương đương App\Models\UserLog trong Laravel
 * Bảng: user_logs - lưu log đăng nhập, kiểm tra failed attempt
 */
@Entity('user_logs')
export class UserLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  ip_client: string;

  @Column({ nullable: true })
  status: string; // 'success' | 'fail'

  @Column({ nullable: true })
  sign_in_time: number;

  @Column({ nullable: true })
  sign_out_time: number;

  @Column({ nullable: true })
  group_id: number;

  @Column({ nullable: true })
  user_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
