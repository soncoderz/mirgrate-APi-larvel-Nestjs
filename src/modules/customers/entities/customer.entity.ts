import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Customer entity - tương đương App\Models\Customer trong Laravel
 * Bảng: customers
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  group_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  tags: string;

  @Column({ default: 1 })
  status: number;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
