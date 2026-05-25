import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getCustomers(filters: any, page = 1, perPage = 20) {
    const qb = this.customerRepository.createQueryBuilder('customer');

    if (filters.group_id) {
      qb.andWhere('customer.group_id = :groupId', { groupId: filters.group_id });
    }
    if (filters.search) {
      qb.andWhere('(customer.name LIKE :search OR customer.phone LIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: items,
      meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) },
    };
  }

  async getCustomerById(id: number) {
    return this.customerRepository.findOne({ where: { id } });
  }

  async getCustomerByPhone(phone: string) {
    return this.customerRepository.findOne({ where: { phone } });
  }

  async addCustomer(data: Partial<Customer>) {
    const customer = this.customerRepository.create(data);
    return this.customerRepository.save(customer);
  }

  async updateCustomer(id: number, data: Partial<Customer>) {
    await this.customerRepository.update(id, data);
    return this.getCustomerById(id);
  }

  async removeCustomer(id: number) {
    await this.customerRepository.update(id, { status: 0 });
    return { message: 'Đã xóa khách hàng thành công' };
  }
}
