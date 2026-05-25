import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * IpLock entity - tương đương App\Models\IpLock trong Laravel
 * Bảng: ip_locks - khóa IP sau nhiều lần đăng nhập sai
 */
@Entity('ip_locks')
export class IpLock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ip_client' })
  ip_client: string;

  @Column({ name: 'lock_time' })
  lock_time: number;
}
