import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * User entity - tương đương App\Models\User trong Laravel
 * Bảng: users
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Giống $hidden trong Laravel Model
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'isOnline', default: 0 })
  isOnline: number;

  @Column({ name: 'remember_token', nullable: true })
  @Exclude()
  remember_token: string;

  @Column({ nullable: true })
  group_id: number;

  @Column({ nullable: true })
  extension: string;

  @Column({ nullable: true })
  user_type_id: number;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 1 })
  status: number;

  @Column({ nullable: true })
  email_verified_at: Date;

  @CreateDateColumn({ name: 'created_at', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
