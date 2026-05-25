import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CdrEntity } from './entities/cdr.entity';

@Injectable()
export class CdrService {
  constructor(
    @InjectRepository(CdrEntity, 'voice_server_1')
    private cdrRepository: Repository<CdrEntity>,
  ) {}

  /**
   * Lấy danh sách cuộc gọi - POST /api/v1/cdr/getCalls
   * Tương đương CdrController::getCalls() trong Laravel
   */
  async getCalls(filters: any, page = 1, perPage = 20) {
    const qb = this.cdrRepository.createQueryBuilder('cdr');

    if (filters.src) {
      qb.andWhere('cdr.src = :src', { src: filters.src });
    }
    if (filters.dst) {
      qb.andWhere('cdr.dst = :dst', { dst: filters.dst });
    }
    if (filters.start_date && filters.end_date) {
      qb.andWhere('cdr.calldate BETWEEN :start AND :end', {
        start: filters.start_date,
        end: filters.end_date,
      });
    }
    if (filters.disposition) {
      qb.andWhere('cdr.disposition = :disposition', { disposition: filters.disposition });
    }

    const [items, total] = await qb
      .orderBy('cdr.calldate', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: items,
      meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) },
    };
  }

  /**
   * Lấy thống kê cuộc gọi - POST /api/v1/cdr/getStaticCalls
   * Tương đương CdrController::getStaticCalls() trong Laravel
   */
  async getStaticCalls(filters: any) {
    const qb = this.cdrRepository.createQueryBuilder('cdr');

    if (filters.start_date && filters.end_date) {
      qb.andWhere('cdr.calldate BETWEEN :start AND :end', {
        start: filters.start_date,
        end: filters.end_date,
      });
    }

    const total = await qb.getCount();
    const answered = await qb.andWhere('cdr.disposition = :d', { d: 'ANSWERED' }).getCount();

    return {
      total,
      answered,
      unanswered: total - answered,
    };
  }

  /**
   * Lấy chi tiết cuộc gọi - POST /api/v1/cdr/getCallDetail
   */
  async getCallDetail(uniqueid: string) {
    return this.cdrRepository.findOne({ where: { uniqueid } });
  }
}
