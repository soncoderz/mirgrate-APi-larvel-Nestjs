import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Cdr entity - tương đương App\Entities\Voice_server_1\Cdr trong Laravel
 * Bảng: cdr (trên database voice_server_1)
 */
@Entity('cdr')
export class CdrEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  calldate: string;

  @Column({ nullable: true })
  clid: string;

  @Column({ nullable: true })
  src: string;

  @Column({ nullable: true })
  dst: string;

  @Column({ nullable: true })
  dcontext: string;

  @Column({ nullable: true })
  channel: string;

  @Column({ nullable: true })
  dstchannel: string;

  @Column({ nullable: true })
  lastapp: string;

  @Column({ nullable: true })
  lastdata: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  billsec: number;

  @Column({ nullable: true })
  disposition: string;

  @Column({ nullable: true })
  amaflags: number;

  @Column({ nullable: true })
  accountcode: string;

  @Column({ nullable: true })
  uniqueid: string;

  @Column({ nullable: true })
  userfield: string;
}
